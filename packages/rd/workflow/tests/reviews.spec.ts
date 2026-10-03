import { expect, it } from 'vitest'
import { fixture } from './helpers.ts'
it('blocksFreezeUntilRequiredReviewsPass and recordsNotApplicableWithReason', () => {
  const f = fixture()
  try {
    const requirementId = f.requirement(),
      versionId = f.version()
    f.send({ type: 'version.assign', versionId, requirementId, included: true })
    f.send({ type: 'requirement.review', requirementId, outcome: 'passed', note: 'Approved' })
    expect(f.send({ type: 'version.freeze', versionId }).errorCode).toBe('REVIEW_INCOMPLETE')
    f.approve(versionId)
    expect(
      f.send({
        type: 'review.decide',
        versionId,
        nodeId: '10',
        outcome: 'not-applicable',
        note: 'No security-sensitive changes',
        artifactIds: [],
      }).status,
    ).toBe('applied')
    expect(f.send({ type: 'version.freeze', versionId }).status).toBe('applied')
    expect(f.state().versions[0]?.baselines[0]?.requirements[0]?.revision).toBe(1)
  } finally {
    f.repo.close()
  }
})
it('doesNotCarryApprovalAcrossRevisions', () => {
  const f = fixture()
  try {
    const requirementId = f.requirement(),
      versionId = f.version()
    f.send({ type: 'version.assign', versionId, requirementId, included: true })
    f.send({ type: 'requirement.review', requirementId, outcome: 'passed', note: 'Approved' })
    f.approve(versionId)
    f.send({
      type: 'requirement.revise',
      requirementId,
      title: 'Changed',
      content: 'Changed scope',
      acceptance: 'Changed criteria',
      priority: 'P0',
      ownerId: f.actor.member.id,
    })
    expect(f.state().requirements[0]?.review).toBe('pending')
    expect(f.state().versions[0]?.nodes['07']?.outcome).toBe('pending')
    expect(f.send({ type: 'version.freeze', versionId }).errorCode).toBe('REVIEW_INCOMPLETE')
  } finally {
    f.repo.close()
  }
})
it('rejectsReviewerForgery even with forged in-process roles', () => {
  const f = fixture()
  try {
    f.send({ type: 'member.create', username: 'dev', name: 'Dev', password: 'developer-12345', roles: ['developer'] })
    const dev = f.repo.authenticate(f.repo.login('dev', 'developer-12345').token)
    const versionId = f.version(),
      artifactId = f.evidence(versionId)
    dev.member.roles.push('tester')
    expect(
      f.repo.dispatch(
        {
          commandId: 'forged',
          scope: { projectId: f.state().id },
          expectedRevision: f.state().revision,
          payload: {
            type: 'review.decide',
            versionId,
            nodeId: '08',
            outcome: 'passed',
            note: 'Forged',
            artifactIds: [artifactId],
          },
        },
        dev,
      ).errorCode,
    ).toBe('FORBIDDEN')
  } finally {
    f.repo.close()
  }
})
