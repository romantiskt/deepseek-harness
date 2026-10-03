import { expect, it } from 'vitest'
import { fixture } from './helpers.ts'
it('persistsRequirementRevision', () => {
  const f = fixture()
  try {
    const id = f.requirement()
    expect(
      f.send({
        type: 'requirement.revise',
        requirementId: id,
        title: 'Updated',
        content: 'Revised',
        acceptance: 'Second acceptance',
        priority: 'P2',
        ownerId: f.actor.member.id,
      }).status,
    ).toBe('applied')
    expect(f.state().requirements[0]?.revision).toBe(2)
    expect(f.state().artifacts.filter(a => a.scope.requirementId === id)).toHaveLength(2)
  } finally {
    f.repo.close()
  }
})
it('assignsOneActiveVersion', () => {
  const f = fixture()
  try {
    const requirementId = f.requirement(),
      a = f.version(),
      b = f.version()
    expect(f.send({ type: 'version.assign', versionId: a, requirementId, included: true }).status).toBe('applied')
    expect(f.send({ type: 'version.assign', versionId: b, requirementId, included: true }).errorCode).toBe(
      'ALREADY_ASSIGNED',
    )
    f.send({ type: 'version.assign', versionId: a, requirementId, included: false })
    expect(f.send({ type: 'version.assign', versionId: b, requirementId, included: true }).status).toBe('applied')
  } finally {
    f.repo.close()
  }
})
it('rejectsFrozenScopeMutation', () => {
  const f = fixture()
  try {
    const requirementId = f.requirement(),
      versionId = f.version()
    f.send({ type: 'version.assign', versionId, requirementId, included: true })
    f.send({ type: 'requirement.review', requirementId, outcome: 'passed', note: 'Approved' })
    f.approve(versionId)
    expect(f.send({ type: 'version.freeze', versionId }).status).toBe('applied')
    expect(f.send({ type: 'version.assign', versionId, requirementId, included: false }).errorCode).toBe('FROZEN_SCOPE')
    expect(
      f.send({
        type: 'requirement.revise',
        requirementId,
        title: 'Bypass',
        content: 'Change',
        acceptance: 'New',
        priority: 'P0',
        ownerId: f.actor.member.id,
      }).errorCode,
    ).toBe('FROZEN_SCOPE')
  } finally {
    f.repo.close()
  }
})
