import { expect, it } from 'vitest'
import { fixture } from './helpers.ts'
import type { EntityId } from '../../contracts/src/types.ts'
it('completesMainlineAndReturnsFeedback with new test batches and independent UAT', () => {
  const f = fixture()
  try {
    const requirementId = f.requirement(),
      versionId = f.version()
    const ok = (value: ReturnType<typeof f.send>) => {
      expect(value, value.errorCode).toMatchObject({ status: 'applied' })
      return value.entityId
    }
    ok(f.send({ type: 'version.assign', versionId, requirementId, included: true }))
    ok(f.send({ type: 'requirement.review', requirementId, outcome: 'passed', note: 'Reviewed' }))
    f.approve(versionId)
    ok(f.send({ type: 'version.freeze', versionId }))
    const workspaceId = 'checkout-test' as EntityId
    f.repo.saveWorkspace(
      {
        id: workspaceId,
        name: 'isolated',
        path: '/isolated/test',
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
    ok(f.send({ type: 'task.complete', taskId, note: 'Reviewed diff' }))
    for (const nodeId of ['14', '15', '16', '17'])
      ok(
        f.send({
          type: 'node.submitEvidence',
          versionId,
          nodeId,
          outcome: 'passed',
          note: 'Verified',
          candidateCommit: 'a'.repeat(40),
          evidence: 'isolated://check/1',
        }),
      )
    const first = ok(
      f.send({
        type: 'submission.create',
        versionId,
        commit: 'a'.repeat(40),
        artifact: 'isolated://build/1',
        environment: 'isolated-test',
        selfTest: 'Passed',
      }),
    )
    const defectId = ok(
      f.send({
        type: 'defect.create',
        submissionId: first,
        title: 'Edge case',
        severity: 'major',
        evidence: 'Reproduced',
      }),
    )
    ok(f.send({ type: 'submission.exit', submissionId: first, passed: false, evidence: 'Edge case failed' }))
    ok(f.send({ type: 'task.bindWorkspace', taskId, workspaceId }))
    ok(f.send({ type: 'task.complete', taskId, note: 'Fixed edge case' }))
    ok(f.send({ type: 'defect.fix', defectId, commit: 'b'.repeat(40), evidence: 'Fixed edge' }))
    for (const nodeId of ['14', '15', '16', '17'])
      ok(
        f.send({
          type: 'node.submitEvidence',
          versionId,
          nodeId,
          outcome: 'passed',
          note: 'Verified new candidate',
          candidateCommit: 'b'.repeat(40),
          evidence: 'isolated://check/2',
        }),
      )
    const second = ok(
      f.send({
        type: 'submission.create',
        versionId,
        commit: 'b'.repeat(40),
        artifact: 'isolated://build/2',
        environment: 'isolated-test',
        selfTest: 'Passed',
      }),
    )
    expect(
      f.send({ type: 'submission.exit', submissionId: second, passed: true, evidence: 'No cases' }).errorCode,
    ).toBe('TEST_CASES_INCOMPLETE')
    expect(f.send({ type: 'testCase.add', submissionId: first, title: 'Stale' }).errorCode).toBe('STALE_SUBMISSION')
    ok(f.send({ type: 'defect.verify', defectId, submissionId: second, passed: true, evidence: 'Retested new build' }))
    const caseId = ok(f.send({ type: 'testCase.add', submissionId: second, title: 'Acceptance and regression' }))
    ok(f.send({ type: 'testCase.record', submissionId: second, caseId, result: 'passed', evidence: 'Pass' }))
    ok(f.send({ type: 'submission.exit', submissionId: second, passed: true, evidence: 'Test complete' }))
    expect(
      f.send({
        type: 'node.submitEvidence',
        versionId,
        nodeId: '22',
        outcome: 'passed',
        note: 'No UAT',
        evidence: 'approval',
      }).errorCode,
    ).toBe('UAT_REQUIRED')
    ok(f.send({ type: 'uat.decide', submissionId: second, passed: true, evidence: 'Product accepted' }))
    for (const nodeId of ['22', '23'])
      ok(
        f.send({
          type: 'node.submitEvidence',
          versionId,
          nodeId,
          outcome: 'passed',
          note: 'Ready',
          evidence: 'isolated://release-candidate/2',
        }),
      )
    ok(
      f.send({
        type: 'release.record',
        versionId,
        kind: 'gray',
        environment: 'isolated',
        evidence: 'Simulated external evidence',
      }),
    )
    ok(
      f.send({
        type: 'node.submitEvidence',
        versionId,
        nodeId: '25',
        outcome: 'passed',
        note: 'Metrics stable',
        evidence: 'isolated://metrics',
      }),
    )
    ok(
      f.send({
        type: 'release.record',
        versionId,
        kind: 'full',
        environment: 'isolated',
        evidence: 'Simulated external evidence',
      }),
    )
    ok(
      f.send({
        type: 'release.record',
        versionId,
        kind: 'verify',
        environment: 'isolated',
        evidence: 'Simulated external verification',
      }),
    )
    for (const nodeId of ['28', '31'])
      ok(
        f.send({
          type: 'node.submitEvidence',
          versionId,
          nodeId,
          outcome: 'passed',
          note: 'Improvement recorded',
          evidence: 'isolated://feedback',
        }),
      )
    const feedbackId = ok(
      f.send(
        {
          type: 'requirement.create',
          title: 'Follow-up',
          content: 'From test feedback',
          acceptance: 'Improved',
          priority: 'P2',
          ownerId: f.actor.member.id,
        },
        { versionId, nodeId: '31' },
      ),
    )
    ok(f.send({ type: 'version.close', versionId, retrospective: 'Learnings', knowledge: 'SOP' }))
    expect(f.state().versions[0]?.status).toBe('closed')
    for (const kind of ['gray', 'full', 'verify', 'rollback', 'hotfix'] as const) {
      expect(
        f.send({ type: 'release.record', versionId, kind, environment: 'isolated', evidence: 'Late record' }).errorCode,
      ).toBe('VERSION_CLOSED')
    }
    expect(f.state().versions[0]?.status).toBe('closed')
    const feedback = f.state().requirements.find(r => r.id === feedbackId)!
    expect(feedback.versionId).toBeNull()
    expect(f.state().artifacts.find(a => a.id === feedback.artifactId)?.scope.versionId).toBe(versionId)
    expect(f.state().submissions[0]?.status).toBe('superseded')
    expect(f.state().submissions[1]?.uat).toBe('passed')
  } finally {
    f.repo.close()
  }
})
it('reopens affected nodes, retains documents and reactivates tasks only on a new baseline', () => {
  const f = fixture()
  try {
    const requirementId = f.requirement(),
      versionId = f.version()
    f.send({ type: 'version.assign', versionId, requirementId, included: true })
    f.send({ type: 'requirement.review', requirementId, outcome: 'passed', note: 'Approved' })
    f.approve(versionId)
    f.send({ type: 'version.freeze', versionId })
    const taskId = f.send({ type: 'task.create', versionId, title: 'Implement', ownerId: f.actor.member.id }).entityId
    const oldArtifact = f.state().requirements[0]!.artifactId
    const changeId = f.send({
      type: 'change.propose',
      versionId,
      requirementId,
      title: 'Revised',
      content: 'New behavior',
      acceptance: 'New checks',
      impact: 'Code and tests',
      affectedNodes: ['05', '06', '07', '08'],
    }).entityId
    expect(f.send({ type: 'change.decide', changeId, approved: true, note: 'Approved' }).status).toBe('applied')
    expect(f.state().versions[0]?.nodes['09']?.outcome).toBe('passed')
    expect(f.state().artifacts.some(a => a.id === oldArtifact)).toBe(true)
    expect(f.state().tasks[0]?.status).toBe('paused')
    f.send({ type: 'requirement.review', requirementId, outcome: 'passed', note: 'Re-reviewed' })
    f.approve(versionId)
    f.send({ type: 'version.freeze', versionId })
    expect(f.state().tasks.find(t => t.id === taskId)).toMatchObject({ baseline: 2, status: 'todo' })
    expect(f.state().versions[0]?.baselines[0]?.requirements[0]?.artifactId).toBe(oldArtifact)
    const workspaceId = 'rebased-checkout' as EntityId
    f.repo.saveWorkspace(
      {
        id: workspaceId,
        name: 'rebase',
        path: '/isolated/rebase',
        branch: 'main',
        head: 'a'.repeat(40),
        dirty: false,
        host: 'local',
        checkedAt: new Date().toISOString(),
      },
      f.actor,
    )
    expect(f.send({ type: 'task.bindWorkspace', taskId, workspaceId }).status).toBe('applied')
    expect(f.state().versions[0]?.nodes['12']?.outcome).toBe('passed')
  } finally {
    f.repo.close()
  }
})
