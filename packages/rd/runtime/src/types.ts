/** Public scoped conversation and execution status. */
export interface ChatMessage {
  /** Durable message identity. */ id: string
  /** Message author. */ role: 'user' | 'assistant' | 'system'
  /** Plain, safely rendered text. */ text: string
}
/** View of one member-owned Harness session. */
export interface ChatSnapshot {
  /** Stable session identity. */ sessionId: string
  /** Scoped runtime state. */ status: 'idle' | 'running' | 'error'
  /** Logged transcript. */ messages: ChatMessage[]
  /** Safe runtime error detail. */ error: string
}
