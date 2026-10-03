import { expect, it } from 'vitest'
import { fixture } from './helpers.ts'
import type { EntityId } from '../../contracts/src/types.ts'

/** Prepare a real aggregate with reviewed scope and a completed implementation. */
function candidateFixture() {
  const f = fixture()
  const ok = (receipt: ReturnType<typeof f.send>) => {
    expect(receipt, receipt.errorCode).toMatchObject({ status: 'applied' })
    return receipt.entityId
  }
  const requirementId = f.requirement(),
    versionId = f.version()
  ok(f.send({ type: 'version.assign', versionId, requirementId, included: true }))
  ok(f.send({ type: 'requirement.review', requirementId, outcome: 'passed', note: 'Approved' }))
  f.approve(versionId)
  ok(f.send({ type: 'version.freeze', versionId }))
  const workspaceId = 'review-checkout' as EntityId
  f.repo.saveWorkspace(
    {
      id: workspaceId,
      path: '/isolated/test',
      name: 'test',
      branch: 'main',
      head: 'a'.repeat(40),
      dirty: false,
      host: 'local',
      checkedAt: new Date().toISOString(),
    },
    f.actor,
  )
  const taskId = ok(f.send({ type: 'task.create', versionId, title: 'Implement', ownerId: f.actor.member.id }))
  ok(f.send({ type: 'task.bindWorkspace', taskId, workspaceId }))
  ok(f.send({ type: 'task.complete', taskId, note: 'Complete' }))
  const approveCandidate = (candidateCommit: string) => {
    for (const nodeId of ['14', '15', '16', '17'])
      ok(
        f.send({
          type: 'node.submitEvidence',
          versionId,
          nodeId,
          candidateCommit,
          note: 'Reviewed this commit',
          outcome: 'passed',
          evidence: 'isolated://candidate-check',
        }),
      )
  }
  const submit = (commit: string) =>
    f.send({
      type: 'submission.create',
      versionId,
      commit,
      artifact: 'isolated://build',
      environment: 'isolated',
      selfTest: 'passed',
    })
  return { ...f, ok, versionId, taskId, workspaceId, approveCandidate, submit }
}

it('requires renewed CR and checks for a changed candidate commit', () => {
  const f = candidateFixture()
  try {
    f.approveCandidate('a'.repeat(40))
    expect(f.submit('b'.repeat(40)).errorCode).toBe('CANDIDATE_REVIEW_REQUIRED')
    f.approveCandidate('b'.repeat(40))
    expect(f.submit('b'.repeat(40)).status).toBe('applied')
  } finally {
    f.repo.close()
  }
})

it('returns rejected UAT to development and requires a new reviewed test batch', () => {
  const f = candidateFixture()
  try {
    f.approveCandidate('a'.repeat(40))
    const submissionId = f.ok(f.submit('a'.repeat(40)))
    const caseId = f.ok(f.send({ type: 'testCase.add', submissionId, title: 'Acceptance' }))
    f.ok(f.send({ type: 'testCase.record', submissionId, caseId, result: 'passed', evidence: 'passed' }))
    f.ok(f.send({ type: 'submission.exit', submissionId, passed: true, evidence: 'QA passed' }))
    f.ok(f.send({ type: 'uat.decide', submissionId, passed: false, evidence: 'Product rejected the behavior' }))
    expect(f.state().versions[0]?.status).toBe('development')
    expect(f.state().submissions[0]).toMatchObject({ status: 'rejected', uat: 'rejected' })
    expect(f.submit('a'.repeat(40)).errorCode).toBe('DEVELOPMENT_INCOMPLETE')
    f.ok(f.send({ type: 'task.bindWorkspace', taskId: f.taskId, workspaceId: f.workspaceId }))
  } finally {
    f.repo.close()
  }
})

it('requires technical re-review after replacing or attaching design evidence', () => {
  const f = fixture()
  try {
    const requirementId = f.requirement(),
      versionId = f.version()
    f.send({ type: 'version.assign', versionId, requirementId, included: true })
    f.send({ type: 'requirement.review', requirementId, outcome: 'passed', note: 'Approved' })
    f.approve(versionId)
    const artifactId = f.evidence(versionId)
    f.send({ type: 'node.recordOutcome', versionId, nodeId: '06', note: 'Revised design', artifactIds: [artifactId] })
    expect(f.send({ type: 'version.freeze', versionId }).errorCode).toBe('REVIEW_INCOMPLETE')
    f.send({
      type: 'review.decide',
      versionId,
      nodeId: '07',
      outcome: 'passed',
      note: 'Re-reviewed',
      artifactIds: [artifactId],
    })
    expect(f.state().versions[0]?.nodes['07']?.artifactIds).toContain(artifactId)
    const additional = f.evidence(versionId)
    f.send({ type: 'node.attachArtifact', versionId, nodeId: '06', artifactId: additional })
    expect(f.state().versions[0]?.nodes['07']?.outcome).toBe('pending')
  } finally {
    f.repo.close()
  }
})
