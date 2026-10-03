/** Development planning, immutable test batches, defects and product acceptance. */
import type { AuthActor, EntityId, ProjectState, WorkflowScope, Submission } from '@deepseek-ai/dsh-rd-contracts/types'
import type { WorkflowCommand } from '@deepseek-ai/dsh-rd-contracts'
import { entity, requireCondition, requireRole } from './access-policy.ts'
import { artifact, baseline, newId } from './workflow-engine.ts'
import { passed, setNode } from './reviews.ts'
/** Reject writes to a historical or invalidated test batch. */
function currentSubmission(project: ProjectState, id: EntityId): Submission {
  const submission = entity(project.submissions, id),
    version = entity(project.versions, submission.versionId)
  requireCondition(
    version.currentSubmissionId === id &&
      submission.baseline === baseline(version) &&
      submission.status !== 'superseded',
    'STALE_SUBMISSION',
  )
  return submission
}
/**
 * @param project - aggregate. @param command - operation. @param scope - context. @param actor - member.
 * @returns changed identity or undefined.
 */
export function applyDeliveries(
  project: ProjectState,
  command: WorkflowCommand,
  scope: WorkflowScope,
  actor: AuthActor,
): EntityId | undefined {
  switch (command.type) {
    case 'task.create': {
      requireRole(actor, 'developer')
      const v = entity(project.versions, command.versionId)
      requireCondition(v.status === 'frozen' || v.status === 'development', 'SCOPE_NOT_FROZEN')
      const id = newId()
      project.tasks.push({
        id,
        versionId: v.id,
        title: command.title,
        ownerId: command.ownerId,
        workspaceId: null,
        status: 'todo',
        baseline: baseline(v),
      })
      v.status = 'development'
      setNode(v, '12', 'passed', command.title, actor)
      return id
    }
    case 'task.bindWorkspace': {
      requireRole(actor, 'developer')
      const task = entity(project.tasks, command.taskId),
        v = entity(project.versions, task.versionId)
      requireCondition(task.ownerId === actor.member.id, 'TASK_OWNER_REQUIRED')
      requireCondition(
        task.status !== 'paused' && task.baseline === baseline(v) && v.status === 'development',
        'SCOPE_NOT_FROZEN',
      )
      entity(project.workspaces, command.workspaceId)
      for (const n of ['13', '14', '15', '16', '17']) if (v.nodes[n]) v.nodes[n].outcome = 'pending'
      task.workspaceId = command.workspaceId
      task.status = 'working'
      setNode(v, '12', 'passed', task.title, actor)
      return task.id
    }
    case 'task.complete': {
      requireRole(actor, 'developer')
      const task = entity(project.tasks, command.taskId),
        v = entity(project.versions, task.versionId)
      requireCondition(task.ownerId === actor.member.id, 'TASK_OWNER_REQUIRED')
      requireCondition(
        task.workspaceId !== null && task.status === 'working' && task.baseline === baseline(v),
        'TASK_NOT_READY',
      )
      task.status = 'done'
      artifact(project, actor, { ...scope, versionId: v.id }, task.title, command.note, 'development-result')
      if (project.tasks.filter(t => t.versionId === v.id).every(t => t.status === 'done' && t.baseline === baseline(v)))
        setNode(v, '13', 'passed', command.note, actor)
      return task.id
    }
    case 'submission.create': {
      requireRole(actor, 'developer')
      const v = entity(project.versions, command.versionId)
      requireCondition(
        baseline(v) > 0 &&
          ['development', 'testing', 'uat'].includes(v.status) &&
          ['13', '14', '15', '16', '17'].every(n => passed(v, n)),
        'DEVELOPMENT_INCOMPLETE',
      )
      requireCondition(
        ['14', '15', '16', '17'].every(
          n => v.nodes[n]?.candidateCommit === command.commit && v.nodes[n].baseline === baseline(v),
        ),
        'CANDIDATE_REVIEW_REQUIRED',
      )
      const tasks = project.tasks.filter(t => t.versionId === v.id)
      requireCondition(
        tasks.length > 0 && tasks.every(t => t.status === 'done' && t.baseline === baseline(v)),
        'DEVELOPMENT_INCOMPLETE',
      )
      requireCondition(
        project.defects.filter(d => d.versionId === v.id).every(d => d.status !== 'open'),
        'OPEN_DEFECTS',
      )
      if (v.currentSubmissionId) entity(project.submissions, v.currentSubmissionId).status = 'superseded'
      const id = newId()
      project.submissions.push({
        id,
        versionId: v.id,
        baseline: baseline(v),
        commit: command.commit,
        artifact: command.artifact,
        environment: command.environment,
        selfTest: command.selfTest,
        createdAt: new Date().toISOString(),
        cases: [],
        status: 'testing',
        uat: 'pending',
        uatEvidence: '',
      })
      v.currentSubmissionId = id
      v.status = 'testing'
      for (const key of ['18', '19', '20', '21', '22', '23', '24', '25', '26', '27'])
        if (v.nodes[key]) v.nodes[key].outcome = 'pending'
      return id
    }
    case 'testCase.add': {
      requireRole(actor, 'tester')
      const s = currentSubmission(project, command.submissionId)
      requireCondition(s.status === 'testing', 'TEST_BATCH_CLOSED')
      const id = newId()
      s.cases.push({ id, title: command.title, result: 'pending', evidence: '' })
      return id
    }
    case 'testCase.record': {
      requireRole(actor, 'tester')
      const s = currentSubmission(project, command.submissionId)
      requireCondition(s.status === 'testing', 'TEST_BATCH_CLOSED')
      const c = entity(s.cases, command.caseId)
      c.result = command.result
      c.evidence = command.evidence
      return c.id
    }
    case 'defect.create': {
      requireRole(actor, 'tester')
      const s = currentSubmission(project, command.submissionId),
        v = entity(project.versions, s.versionId)
      requireCondition(s.status === 'testing', 'TEST_BATCH_CLOSED')
      const id = newId()
      project.defects.push({
        id,
        versionId: s.versionId,
        submissionId: s.id,
        title: command.title,
        severity: command.severity,
        status: 'open',
        evidence: command.evidence,
        fixCommit: '',
        verifiedSubmissionId: null,
      })
      setNode(v, '19', 'changes', command.title, actor)
      return id
    }
    case 'defect.fix': {
      requireRole(actor, 'developer')
      const d = entity(project.defects, command.defectId)
      requireCondition(d.status === 'open', 'DEFECT_NOT_OPEN')
      d.status = 'fixed'
      d.fixCommit = command.commit
      artifact(project, actor, { ...scope, versionId: d.versionId }, d.title, command.evidence, 'defect-fix')
      return d.id
    }
    case 'defect.verify': {
      requireRole(actor, 'tester')
      const d = entity(project.defects, command.defectId),
        s = currentSubmission(project, command.submissionId)
      requireCondition(
        d.versionId === s.versionId && d.status === 'fixed' && s.status === 'testing' && s.id !== d.submissionId,
        'RESUBMISSION_REQUIRED',
      )
      d.status = command.passed ? 'closed' : 'open'
      d.verifiedSubmissionId = s.id
      artifact(
        project,
        actor,
        { ...scope, versionId: d.versionId, submissionId: s.id },
        d.title,
        command.evidence,
        'defect-verification',
      )
      return d.id
    }
    case 'submission.exit': {
      requireRole(actor, 'tester')
      const s = currentSubmission(project, command.submissionId),
        v = entity(project.versions, s.versionId)
      requireCondition(s.status === 'testing', 'TEST_BATCH_CLOSED')
      if (command.passed) {
        requireCondition(s.cases.length > 0 && s.cases.every(c => c.result === 'passed'), 'TEST_CASES_INCOMPLETE')
        requireCondition(
          project.defects.filter(d => d.versionId === s.versionId).every(d => d.status === 'closed'),
          'OPEN_DEFECTS',
        )
      }
      s.status = command.passed ? 'passed' : 'rejected'
      s.uat = 'pending'
      v.status = command.passed ? 'uat' : 'development'
      const a = artifact(
        project,
        actor,
        { ...scope, versionId: v.id, submissionId: s.id },
        '测试准出报告',
        command.evidence,
        'test-report',
      )
      for (const n of ['18', '19', '20'])
        setNode(v, n, command.passed ? 'passed' : 'changes', command.evidence, actor, [a.id])
      return s.id
    }
    case 'uat.decide': {
      requireRole(actor, 'product')
      const s = currentSubmission(project, command.submissionId),
        v = entity(project.versions, s.versionId)
      requireCondition(s.status === 'passed' && v.status === 'uat' && s.uat === 'pending', 'TEST_EXIT_REQUIRED')
      s.uat = command.passed ? 'passed' : 'rejected'
      s.uatEvidence = command.evidence
      if (!command.passed) {
        s.status = 'rejected'
        v.status = 'development'
        for (const n of ['13', '14', '15', '16', '17', '22', '23', '24', '25', '26', '27'])
          if (v.nodes[n]) v.nodes[n].outcome = 'pending'
      }
      const a = artifact(
        project,
        actor,
        { ...scope, versionId: v.id, submissionId: s.id },
        '产品验收报告',
        command.evidence,
        'uat-report',
      )
      setNode(v, '21', s.uat, command.evidence, actor, [a.id])
      return s.id
    }
    default:
      return undefined
  }
}
