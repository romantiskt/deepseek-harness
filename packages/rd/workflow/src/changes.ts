/** Explicit change approval with dependency-based invalidation. */
import type { AuthActor, EntityId, ProjectState, WorkflowScope } from '@deepseek-ai/dsh-rd-contracts/types'
import type { WorkflowCommand } from '@deepseek-ai/dsh-rd-contracts'
import { entity, requireCondition, requireRole } from './access-policy.ts'
import { artifact, newId } from './workflow-engine.ts'
/** Downstream execution must be reconsidered after any frozen-scope change. */
const deliveryNodes = [
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19',
  '20',
  '21',
  '22',
  '23',
  '24',
  '25',
  '26',
  '27',
]
/**
 * @param project - aggregate. @param command - operation. @param scope - fixed context. @param actor -
 * authenticated human. @returns changed identity or undefined.
 */
export function applyChanges(
  project: ProjectState,
  command: WorkflowCommand,
  scope: WorkflowScope,
  actor: AuthActor,
): EntityId | undefined {
  if (command.type === 'change.propose') {
    requireRole(actor, 'product')
    const v = entity(project.versions, command.versionId),
      r = entity(project.requirements, command.requirementId)
    requireCondition(r.versionId === v.id && v.requirementIds.includes(r.id), 'NOT_ASSIGNED')
    requireCondition(v.status !== 'closed', 'VERSION_CLOSED')
    const id = newId()
    project.changes.push({
      id,
      versionId: v.id,
      requirementId: r.id,
      title: command.title,
      content: command.content,
      acceptance: command.acceptance,
      impact: command.impact,
      affectedNodes: [...new Set([...command.affectedNodes, '05', '06', '07', ...deliveryNodes])],
      status: 'pending',
      createdBy: actor.member.id,
      decision: '',
    })
    return id
  }
  if (command.type === 'change.decide') {
    requireRole(actor, 'product')
    const change = entity(project.changes, command.changeId)
    requireCondition(change.status === 'pending', 'CHANGE_ALREADY_DECIDED')
    const v = entity(project.versions, change.versionId),
      r = entity(project.requirements, change.requirementId)
    change.status = command.approved ? 'approved' : 'rejected'
    change.decision = command.note
    artifact(
      project,
      actor,
      { ...scope, versionId: v.id, requirementId: r.id },
      change.title,
      `${change.impact}\n${command.note}`,
      `change:${change.status}`,
    )
    if (command.approved) {
      const doc = artifact(
        project,
        actor,
        { ...scope, versionId: v.id, requirementId: r.id },
        change.title,
        `${change.content}\n\n验收标准\n${change.acceptance}`,
        'requirement',
      )
      r.title = change.title
      r.content = change.content
      r.acceptance = change.acceptance
      r.revision++
      r.artifactId = doc.id
      r.review = 'pending'
      r.reviewedRevision = 0
      for (const node of change.affectedNodes) if (v.nodes[node]) v.nodes[node].outcome = 'pending'
      v.status = 'planning'
      if (v.currentSubmissionId) entity(project.submissions, v.currentSubmissionId).status = 'superseded'
      for (const task of project.tasks.filter(t => t.versionId === v.id)) task.status = 'paused'
    }
    return change.id
  }
  return undefined
}
