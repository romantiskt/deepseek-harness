/** Context selection over the native Harness Session stream. */
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { WorkflowScope } from '@deepseek-ai/dsh-rd-contracts/types'
import type { ConversationState } from '@deepseek-ai/dsh-rd-runtime/types'

/** Authenticated scope lookup and native Session lifetime operations. */
export interface ChatApi {
  /** Resolve the owned Session without reading its transcript. */
  chat(scope: string, task: string): Promise<ConversationState>
  /** Admit a new user message through the scoped runtime. */
  prompt(scope: string, text: string, task: string): Promise<string>
  /** Await quiescence of the selected execution. */
  stop(scope: string, task: string): Promise<void>
  /** Load the Host session catalog before retaining a restored or newly created identity. */
  refreshSessions(): Promise<void>
  /** Retain native history and status until the returned disposer runs. */
  watch(id: string, update: (running: boolean) => void, failed: (error: string) => void): () => void
}

/** Scoped controls; the native Conversation owns all transcript rendering. */
export interface ChatView extends ConversationState {
  /** True until the selected context is resolved. */
  loading: boolean
  /** Canonical scope, task and baseline identity. */
  context: string
}

/** Own one native Session reference and invalidate late context responses. */
export class ChatModel {
  /** Framework-observable control state; transcript text is never copied here. */
  readonly state = createSnapshotStore<ChatView>({ sessionId: '', status: 'idle', error: '', loading: false, context: '' })
  /** Captured scope for the next authorized submission. */
  private selected: { scope: string; task: string } | undefined
  /** Reject responses belonging to a previous selection. */
  private generation = 0
  /** Release the native stream when its selection or plugin ends. */
  private unwatch: (() => void) | undefined
  /** Reject concurrent sends while input admission is unresolved. */
  private sending = false

  /**
   * Configure the scoped runtime and business refresh callback.
   * @param api - authenticated Session adapter.
   * @param refresh - reload artifacts after a turn completes.
   */
  constructor(private readonly api: ChatApi, private readonly refresh: () => Promise<void>) {}

  /**
   * Select a business context without creating a Session or submitting input.
   * @param scope - selected project context.
   * @param task - explicit development task, empty for product conversations.
   * @param baseline - current frozen baseline, zero before freezing.
   */
  select(scope: WorkflowScope, task: string, baseline: number): void {
    const json = JSON.stringify(scope)
    const context = JSON.stringify([json, task, baseline])
    if (context === this.state.getSnapshot().context) return
    this.generation++
    this.unwatch?.()
    this.unwatch = undefined
    this.sending = false
    this.selected = { scope: json, task }
    this.state.set({ sessionId: '', status: 'idle', error: '', loading: true, context })
    void this.load(this.generation)
  }

  /** Re-resolve the selected Session after transport reconnection. */
  reconnect(): void {
    if (!this.selected) return
    this.generation++
    this.unwatch?.()
    this.unwatch = undefined
    this.sending = false
    this.state.set({ ...this.state.getSnapshot(), sessionId: '', status: 'idle', loading: true, error: '' })
    void this.load(this.generation)
  }

  /** Attach native streaming only to the still-selected context. */
  private attach(id: string, generation: number): void {
    if (!id || generation !== this.generation) return
    this.unwatch?.()
    this.unwatch = this.api.watch(id, (running) => {
      if (generation !== this.generation) return
      const before = this.state.getSnapshot()
      this.state.set({ ...before, status: running ? 'running' : 'idle' })
      if (before.status === 'running' && !running) {
        void this.refresh().catch((error: unknown) => { this.fail(error, generation) })
      }
    }, (error) => { this.fail(error, generation) })
  }

  /** Publish failures only while their operation still owns the selection. */
  private fail(error: unknown, generation: number): void {
    if (generation !== this.generation) return
    this.state.set({ ...this.state.getSnapshot(), loading: false, status: 'error', error: String(error) })
  }

  /** Resolve metadata once; native events supply subsequent status updates. */
  private async load(generation: number): Promise<void> {
    const selected = this.selected
    if (!selected) return
    try {
      const value = await this.api.chat(selected.scope, selected.task)
      if (value.sessionId) await this.api.refreshSessions()
      if (generation !== this.generation) return
      this.state.set({ ...value, loading: false, context: this.state.getSnapshot().context })
      this.attach(value.sessionId, generation)
    } catch (error) {
      this.fail(error, generation)
    }
  }

  /**
   * Submit through the scoped runtime and attach a newly created Session immediately.
   * @param text - human message.
   * @returns whether the host admitted it.
   */
  async send(text: string): Promise<boolean> {
    const selected = this.selected
    const generation = this.generation
    if (!selected || this.sending || this.state.getSnapshot().loading || !text.trim()) return false
    this.sending = true
    this.state.set({ ...this.state.getSnapshot(), status: 'running', error: '' })
    let admitted = false
    try {
      const id = await this.api.prompt(selected.scope, text, selected.task)
      admitted = true
      await this.api.refreshSessions()
      if (generation === this.generation) {
        const previous = this.state.getSnapshot().sessionId
        this.state.set({ ...this.state.getSnapshot(), sessionId: id })
        if (id !== previous) this.attach(id, generation)
      }
      return true
    } catch (error) {
      this.fail(error, generation)
      // A display failure must not invite resubmitting an already admitted message.
      return admitted
    } finally {
      if (generation === this.generation) this.sending = false
    }
  }

  /** Stop the captured owned execution without completing its business task. */
  async stop(): Promise<void> {
    const selected = this.selected
    const generation = this.generation
    if (!selected) return
    try {
      await this.api.stop(selected.scope, selected.task)
      if (generation === this.generation) await this.refresh()
    } catch (error) {
      this.fail(error, generation)
    }
  }

  /** Release the native Session and discard outstanding context responses. */
  dispose(): void {
    this.generation++
    this.unwatch?.()
    this.unwatch = undefined
    this.selected = undefined
    this.state.set({ sessionId: '', status: 'idle', error: '', loading: false, context: '' })
  }
}
