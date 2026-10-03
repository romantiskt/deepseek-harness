/** Role and object lookup checks shared by every business command. */
import type { AuthActor, EntityId, Role } from '@deepseek-ai/dsh-rd-contracts/types'
/** Expected business refusal with a stable UI code. */
export class WorkflowError extends Error {
  /** Business refusal identity. */
  readonly code: string
  /** @param code - machine-readable reason. @param message - safe detail. */
  constructor(code: string, message = code) {
    super(message)
    this.code = code
  }
}
/** @param condition - required predicate. @param code - refusal code. */
export function requireCondition(condition: unknown, code: string): asserts condition {
  if (!condition) throw new WorkflowError(code)
}
/** @param actor - server-resolved actor. @param role - required domain permission. */
export function requireRole(actor: AuthActor, role: Role): void {
  requireCondition(actor.member.roles.includes(role), 'FORBIDDEN')
}
/** @param values - project-owned collection. @param id - requested identity. @returns matching object. */
export function entity<T extends { id: EntityId }>(values: T[], id: EntityId): T {
  const found = values.find(item => item.id === id)
  requireCondition(found, 'NOT_FOUND')
  return found
}
