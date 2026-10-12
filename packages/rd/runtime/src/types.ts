/** Public scoped conversation and execution status. */
import type {} from '@deepseek-ai/dsh-llm'

declare module '@deepseek-ai/dsh-llm' {
  interface MessageSourceMap {
    /**
     * Logged workflow records injected before the selected member request.
     * @persistenceAttribution
     */
    'rd-context': { kind: 'rd-context'; form: 'instructions' }
  }
}

export interface ChatMessage {
  /** Durable message identity. */ id: string
  /** Message author. */ role: 'user' | 'assistant' | 'system'
  /** Plain, safely rendered text. */ text: string
}
/** View of one member-owned Harness session. */
export interface ConversationState {
  /** Stable session identity. */ sessionId: string
  /** Scoped runtime state. */ status: 'idle' | 'running' | 'error'
  /** Safe runtime error detail. */ error: string
}
/** Legacy plain-text transcript for API consumers; the UI uses native Session events. */
export interface ChatSnapshot extends ConversationState {
  /** Logged transcript. */ messages: ChatMessage[]
}
