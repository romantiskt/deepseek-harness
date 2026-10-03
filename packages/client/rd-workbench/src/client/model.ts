/** React-free mirror of authenticated workflow state. */
import { randomUUID } from '@deepseek-ai/dsh-util-crypto'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import type {
  CommandEnvelope,
  CommandReceipt,
  WorkbenchSnapshot,
  LoginResult,
  WorkflowScope,
} from '@deepseek-ai/dsh-rd-contracts/types'
import type { WorkflowCommand } from '@deepseek-ai/dsh-rd-contracts'
/** Remote operations projected into ordinary callback results. */
export interface WorkflowApi {
  /** Check first-time setup. */ needsSetup(): Promise<boolean>
  /** Initialize the first administrator. */ bootstrap(
    username: string,
    name: string,
    password: string,
    projectName: string
  ): Promise<LoginResult>
  /** Authenticate a member. */ login(username: string, password: string): Promise<LoginResult>
  /** End a member session. */ logout(token: string): Promise<void>
  /** Read the authorized snapshot. */ snapshot(token: string): Promise<WorkbenchSnapshot>
  /** Apply one business command. */ execute(token: string, command: string): Promise<CommandReceipt>
}
/** UI-readable state excludes the private login token. */
export interface ModelView {
  /** Current domain or execution state. */
  status: 'loading' | 'setup' | 'login' | 'ready' | 'error'
  /** Last authoritative project read. */
  snapshot: WorkbenchSnapshot | null
  /** Visible recoverable failure. */
  error: string
  /** Whether a user operation is pending. */
  busy: boolean
}
/** State owner used by the slot's framework-generated hook. */
export class WorkbenchModel {
  /** Published view with stable snapshot identity. */
  readonly state = createSnapshotStore<ModelView>({ status: 'loading', snapshot: null, error: '', busy: false })
  /** Private member token, retained only for this browser tab. */
  private token = sessionStorage.getItem('ai-rd.member-session') ?? ''
  /** Reject late responses after sign-out or plugin disposal. */
  private generation = 0
  /** Preserve the exact command after an ambiguous transport failure. */
  private readonly pending = new Map<string, CommandEnvelope<WorkflowCommand>>()
  /** @param api - authenticated host operations. */
  constructor(private readonly api: WorkflowApi) {}
  /** @returns current private token for the sibling scoped runtime adapter. */
  credential(): string {
    return this.token
  }
  /** Load initial state or recover after reconnect. @returns completion. */
  async load(): Promise<void> {
    const generation = this.generation
    try {
      const snapshot = this.token ? await this.api.snapshot(this.token) : null
      const setup = snapshot === null ? await this.api.needsSetup() : false
      if (generation !== this.generation) return
      this.state.set({ status: snapshot ? 'ready' : setup ? 'setup' : 'login', snapshot, error: '', busy: false })
    } catch (error) {
      if (generation !== this.generation) return
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('UNAUTHENTICATED')) {
        this.token = ''
        sessionStorage.removeItem('ai-rd.member-session')
        this.state.set({ status: 'login', snapshot: null, error: message, busy: false })
      } else
        this.state.set({
          ...this.state.getSnapshot(),
          status: this.state.getSnapshot().snapshot ? 'ready' : 'error',
          error: message,
          busy: false,
        })
    }
  }
  /** @param values - local sign-in fields. @returns completion. */
  async signIn(values: { username: string; password: string; name: string; project: string }): Promise<void> {
    await this.perform(async () => {
      const result =
        this.state.getSnapshot().status === 'setup'
          ? await this.api.bootstrap(values.username, values.name, values.password, values.project)
          : await this.api.login(values.username, values.password)
      this.token = result.token
      sessionStorage.setItem('ai-rd.member-session', this.token)
      await this.load()
    })
  }
  /** End the member session without modifying project records. @returns completion. */
  async signOut(): Promise<void> {
    const token = this.token
    this.generation++
    this.pending.clear()
    this.token = ''
    sessionStorage.removeItem('ai-rd.member-session')
    this.state.set({ status: 'login', snapshot: null, error: '', busy: false })
    await this.api.logout(token)
  }
  /**
   * @param payload - business operation. @param scope - fixed UI context. @param expectedRevision - optional
   * artifact revision. @returns whether the host accepted the operation.
   */
  async execute(payload: WorkflowCommand, scope: WorkflowScope, expectedRevision?: number): Promise<boolean> {
    return this.perform(async () => {
      const snapshot = this.state.getSnapshot().snapshot
      if (!snapshot) throw new Error('UNAUTHENTICATED')
      const key = JSON.stringify([scope, payload])
      const command: CommandEnvelope<WorkflowCommand> = this.pending.get(key) ?? {
        commandId: randomUUID(),
        scope,
        expectedRevision: expectedRevision ?? snapshot.project.revision,
        payload,
      }
      this.pending.set(key, command)
      const result = await this.api.execute(this.token, JSON.stringify(command))
      this.pending.delete(key)
      if (result.status === 'rejected') {
        await this.load()
        throw new Error(result.errorCode ?? 'COMMAND_REJECTED')
      }
      await this.load()
    })
  }
  /** Record an asynchronous failure through the same visible error channel. @param operation - side effect. @returns success. */
  async perform(operation: () => Promise<void>): Promise<boolean> {
    this.state.set({ ...this.state.getSnapshot(), busy: true, error: '' })
    try {
      await operation()
      return true
    } catch (error) {
      this.state.set({ ...this.state.getSnapshot(), error: error instanceof Error ? error.message : String(error) })
      return false
    } finally {
      this.state.set({ ...this.state.getSnapshot(), busy: false })
    }
  }
  /** Discard late responses after unmount. */
  dispose(): void {
    this.generation++
  }
}
