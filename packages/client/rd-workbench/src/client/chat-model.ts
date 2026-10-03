/** Scope-aware polling projection of the existing Harness agent, not a second chat engine. */
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { WorkflowScope } from '@deepseek-ai/dsh-rd-contracts/types'
import type { ChatSnapshot } from '@deepseek-ai/dsh-rd-runtime/types'
/** Authenticated scoped session operations. */
export interface ChatApi {
  /** Read durable and live Harness messages. */ chat(scope: string, task: string): Promise<ChatSnapshot>
  /** Admit a new user message. */ prompt(scope: string, text: string, task: string): Promise<string>
  /** Await quiescence of the selected execution. */ stop(scope: string, task: string): Promise<void>
}
/** Published state never contains credentials. */
export interface ChatView extends ChatSnapshot {
  /** True during a context switch. */ loading: boolean
  /** Canonical selected scope. */ context: string
}
/** Projection owner with generation checks across selection changes. */
export class ChatModel {
  /** Framework-observable transcript. */ readonly state = createSnapshotStore<ChatView>({
    sessionId: '',
    status: 'idle',
    messages: [],
    error: '',
    loading: false,
    context: '',
  })
  /** Current scope JSON and selected development task. */ private selected: { scope: string; task: string } | null =
    null
  /** Invalidates outstanding reads after selection changes. */ private generation = 0
  /** One refresh timer owned by this plugin. */ private timer: ReturnType<typeof setTimeout> | undefined
  /**
   * @param api - existing Harness remote adapter. @param refresh - refresh business artifacts after activity.
   * @param interval - live transcript polling interval.
   */
  constructor(
    private readonly api: ChatApi,
    private readonly refresh: () => Promise<void>,
    private readonly interval: number,
  ) {}
  /** @param scope - fixed page context. @param task - explicitly selected task, empty for product conversation. */
  select(scope: WorkflowScope, task: string): void {
    const json = JSON.stringify(scope),
      context = JSON.stringify([json, task])
    if (context === this.state.getSnapshot().context) return
    this.generation++
    clearTimeout(this.timer)
    this.selected = { scope: json, task }
    this.state.set({ sessionId: '', status: 'idle', messages: [], error: '', loading: true, context })
    void this.poll(this.generation)
  }
  /** @param text - human message. @returns whether it was admitted. */
  async send(text: string): Promise<boolean> {
    const selected = this.selected,
      generation = this.generation
    if (!selected) return false
    this.state.set({ ...this.state.getSnapshot(), status: 'running', error: '' })
    try {
      await this.api.prompt(selected.scope, text, selected.task)
      if (generation === this.generation) {
        clearTimeout(this.timer)
        await this.poll(generation)
      }
      return true
    } catch (error) {
      if (generation === this.generation)
        this.state.set({ ...this.state.getSnapshot(), status: 'error', error: String(error) })
      return false
    }
  }
  /** Stop only the selected owned agent; this never completes a development task. */
  async stop(): Promise<void> {
    const selected = this.selected
    if (!selected) return
    try {
      await this.api.stop(selected.scope, selected.task)
      await this.refresh()
    } catch (error) {
      this.state.set({ ...this.state.getSnapshot(), error: String(error) })
    }
  }
  /** Cancel timers and ignore outstanding reads. */
  dispose(): void {
    this.generation++
    clearTimeout(this.timer)
    this.selected = null
    this.state.set({ sessionId: '', status: 'idle', messages: [], error: '', loading: false, context: '' })
  }
  /** Refresh only the current generation and schedule the next bounded read. */
  private async poll(generation: number): Promise<void> {
    const selected = this.selected
    if (!selected || generation !== this.generation) return
    try {
      const value = await this.api.chat(selected.scope, selected.task)
      if (generation !== this.generation) return
      const before = this.state.getSnapshot()
      this.state.set({ ...value, loading: false, context: before.context })
      if (value.messages.length !== before.messages.length || before.status === 'running') await this.refresh()
    } catch (error) {
      if (generation === this.generation)
        this.state.set({ ...this.state.getSnapshot(), loading: false, status: 'error', error: String(error) })
    } finally {
      if (generation === this.generation) {
        clearTimeout(this.timer)
        this.timer = setTimeout(() => {
          void this.poll(generation)
        }, this.interval)
      }
    }
  }
}
