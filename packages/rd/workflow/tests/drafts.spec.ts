import { it, expect } from 'vitest'
import { fixture } from './helpers.ts'
it('keepsOldCardBoundToOriginalScope and rejects reused draft or stale source', () => {
  const f = fixture()
  try {
    const versionId = f.version()
    const artifactId = f.send(
      {
        type: 'artifact.createRevision',
        title: 'Draft',
        kind: 'draft.requirement',
        text: JSON.stringify({
          title: 'Draft',
          content: 'Content',
          acceptance: 'Checks',
          requirementId: null,
          sourceRequirementRevision: 0,
        }),
      },
      { versionId },
    ).entityId
    const payload = {
      type: 'requirement.saveDraft' as const,
      artifactId,
      title: 'Reviewed draft',
      content: 'Edited content',
      acceptance: 'Edited checks',
      priority: 'P1' as const,
      ownerId: f.actor.member.id,
      versionId,
    }
    const otherVersion = f.version()
    expect(f.send(payload, { versionId: otherVersion }).errorCode).toBe('SCOPE_MISMATCH')
    const saved = f.send(payload, { versionId })
    expect(saved.status).toBe('applied')
    expect(f.state().requirements[0]).toMatchObject({ versionId, content: 'Edited content', review: 'pending' })
    expect(f.send(payload, { versionId }).errorCode).toBe('DRAFT_ALREADY_SAVED')
    const requirementId = saved.entityId
    const editDraft = f.send(
      {
        type: 'artifact.createRevision',
        title: 'Revision',
        kind: 'draft.requirement',
        text: JSON.stringify({
          title: 'Revision',
          content: 'Draft body',
          acceptance: 'Checks',
          requirementId,
          sourceRequirementRevision: 1,
        }),
      },
      { versionId, requirementId },
    ).entityId
    f.send({
      type: 'requirement.revise',
      requirementId,
      title: 'New title',
      content: 'Newer human edit',
      acceptance: 'Criteria',
      priority: 'P1',
      ownerId: f.actor.member.id,
    })
    expect(f.send({ ...payload, artifactId: editDraft }, { versionId, requirementId }).errorCode).toBe('STALE_ARTIFACT')
    expect(f.state().requirements[0]?.content).toBe('Newer human edit')
  } finally {
    f.repo.close()
  }
})
