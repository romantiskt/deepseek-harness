/** Pure presentation helpers for authentication, scoped artifacts and draft content. */
/** @param message - host authentication failure. @returns its localized guidance key, if recognized. */
export function loginErrorKey(message: string): 'invalidLogin' | 'sessionExpired' | undefined {
  const code = message.replace(/ \(gateway\/internal\)$/, '')
  if (code === 'INVALID_LOGIN') return 'invalidLogin'
  if (code === 'UNAUTHENTICATED') return 'sessionExpired'
  return undefined
}

/** @param artifacts - immutable artifacts. @param scope - visible business context. @returns only artifacts owned by that context. */
export function filterArtifacts<
  T extends { scope: { projectId: string; versionId?: string | undefined; requirementId?: string | undefined } },
>(
  artifacts: T[],
  scope: { projectId: string; versionId?: string | undefined; requirementId?: string | undefined },
): T[] {
  return artifacts.filter(
    a =>
      a.scope.projectId === scope.projectId &&
      (scope.versionId === undefined || a.scope.versionId === scope.versionId) &&
      (scope.requirementId === undefined || a.scope.requirementId === scope.requirementId),
  )
}

/** UI-only preview of a server-validated structured draft. */
interface DraftPreview {
  /** Proposed heading. */ title: string
  /** Proposed behavior. */ content: string
  /** Proposed acceptance criteria. */ acceptance: string
  /** Original requirement, if this is a revision. */ requirementId: string | null
}
/** @param text - immutable artifact JSON. @returns display fields; domain validation remains on the host. */
export function readDraft(text: string): DraftPreview | undefined {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return undefined
  }
  if (
    !value ||
    typeof value !== 'object' ||
    !('title' in value) ||
    typeof value.title !== 'string' ||
    !('content' in value) ||
    typeof value.content !== 'string' ||
    !('acceptance' in value) ||
    typeof value.acceptance !== 'string' ||
    !('requirementId' in value) ||
    (value.requirementId !== null && typeof value.requirementId !== 'string')
  )
    return undefined
  return {
    title: value.title,
    content: value.content,
    acceptance: value.acceptance,
    requirementId: value.requirementId,
  }
}
