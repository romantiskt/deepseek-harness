/** Record externally executed releases; this service never deploys software. */
import type { AuthActor, EntityId, ProjectState, WorkflowScope } from '@deepseek-ai/dsh-rd-contracts/types'
import type { WorkflowCommand } from '@deepseek-ai/dsh-rd-contracts'
import { entity, requireCondition, requireRole } from './access-policy.ts'
import { artifact, baseline } from './workflow-engine.ts'
import { passed, setNode } from './reviews.ts'
/**
 * @param project - aggregate. @param command - operation. @param scope - context. @param actor - human
 * operator. @returns changed identity or undefined.
 */
export function applyRelease(
  project: ProjectState,
  command: WorkflowCommand,
  scope: WorkflowScope,
  actor: AuthActor,
): EntityId | undefined {
  if (command.type === 'release.record') {
    requireRole(actor, command.kind === 'full' ? 'product' : 'developer')
    const v = entity(project.versions, command.versionId)
    requireCondition(v.status !== 'closed', 'VERSION_CLOSED')
    if (['gray', 'full'].includes(command.kind)) requireCondition(v.status === 'release', 'RELEASE_NOT_READY')
    const s = project.submissions.find(s => s.id === v.currentSubmissionId)
    requireCondition(
      passed(v, '22') && passed(v, '23') && s?.status === 'passed' && s.uat === 'passed' && s.baseline === baseline(v),
      'RELEASE_NOT_READY',
    )
    if (command.kind === 'full') requireCondition(passed(v, '24') && passed(v, '25'), 'GRAY_ANALYSIS_REQUIRED')
    if (['verify', 'rollback', 'hotfix'].includes(command.kind))
      requireCondition(v.status === 'released', 'RELEASE_REQUIRED')
    const a = artifact(
      project,
      actor,
      { ...scope, versionId: v.id },
      `外部发布记录 · ${command.kind}`,
      `${command.environment}\n${command.evidence}`,
      `release:${command.kind}`,
    )
    const node = command.kind === 'gray' ? '24' : command.kind === 'full' ? '26' : '27'
    setNode(v, node, ['rollback', 'hotfix'].includes(command.kind) ? 'changes' : 'passed', command.evidence, actor, [
      a.id,
    ])
    if (command.kind === 'full') {
      v.status = 'released'
      v.releaseEvidence = a.id
    }
    if (command.kind === 'rollback') {
      v.status = 'release'
      setNode(v, '26', 'changes', command.evidence, actor, [a.id])
    }
    return v.id
  }
  if (command.type === 'version.close') {
    requireRole(actor, 'product')
    const v = entity(project.versions, command.versionId)
    requireCondition(
      v.status === 'released' && ['27', '28', '31'].every(n => passed(v, n)),
      'RELEASE_VERIFICATION_REQUIRED',
    )
    const review = artifact(
      project,
      actor,
      { ...scope, versionId: v.id },
      '版本复盘',
      command.retrospective,
      'retrospective',
    )
    const knowledge = artifact(
      project,
      actor,
      { ...scope, versionId: v.id },
      '知识沉淀',
      command.knowledge,
      'knowledge',
    )
    setNode(v, '29', 'passed', command.retrospective, actor, [review.id])
    setNode(v, '30', 'passed', command.knowledge, actor, [knowledge.id])
    v.status = 'closed'
    return v.id
  }
  return undefined
}
