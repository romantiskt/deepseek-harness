/** Human review decisions and immutable scope freezing. */
import type {
  AuthActor,
  EntityId,
  ProjectState,
  WorkflowScope,
  Version,
  Outcome,
} from '@deepseek-ai/dsh-rd-contracts/types'
import type { WorkflowCommand } from '@deepseek-ai/dsh-rd-contracts'
import { entity, requireCondition, requireRole } from './access-policy.ts'
import { workflowTemplate } from './workflow-template.ts'
import { artifact, baseline } from './workflow-engine.ts'
/** @param version - current scope. @param nodeId - required review. @returns whether its outcome satisfies entry. */
export function passed(version: Version, nodeId: string): boolean {
  const value = version.nodes[nodeId]
  return value?.outcome === 'passed' || (nodeId === '10' && value?.outcome === 'not-applicable')
}
/**
 * @param v - current version. @param node - node identity. @param outcome - recorded decision. @param note -
 * reviewer explanation. @param actor - authenticated reviewer. @param artifacts - exact materials.
 */
export function setNode(
  v: Version,
  node: string,
  outcome: Outcome,
  note: string,
  actor: AuthActor,
  artifacts: EntityId[] = [],
): void {
  v.nodes[node] = {
    outcome,
    note,
    actorId: actor.member.id,
    artifactIds: artifacts,
    baseline: baseline(v),
    updatedAt: new Date().toISOString(),
  }
}
/**
 * @param project - mutable project. @param command - checked operation. @param scope - immutable context.
 * @param actor - human reviewer. @returns changed identity or undefined.
 */
export function applyReviews(
  project: ProjectState,
  command: WorkflowCommand,
  scope: WorkflowScope,
  actor: AuthActor,
): EntityId | undefined {
  if (command.type === 'review.decide') {
    const definition = workflowTemplate.flatMap(s => s.nodes).find(n => n.id === command.nodeId)
    requireCondition(definition?.mode === 'approval', 'SPECIAL_ACTION_REQUIRED')
    requireRole(actor, definition.role)
    const v = entity(project.versions, command.versionId)
    requireCondition(!['released', 'closed'].includes(v.status), 'VERSION_CLOSED')
    requireCondition(command.outcome !== 'not-applicable' || command.nodeId === '10', 'REQUIRED_REVIEW')
    requireCondition(command.outcome !== 'passed' || command.artifactIds.length > 0, 'EVIDENCE_REQUIRED')
    if (Number(command.nodeId) <= 10) requireCondition(v.status === 'planning', 'FROZEN_SCOPE')
    if (command.nodeId === '15' || command.nodeId === '17') {
      requireCondition(baseline(v) > 0 && v.status === 'development' && passed(v, '13'), 'DEVELOPMENT_INCOMPLETE')
      requireCondition(command.candidateCommit, 'CANDIDATE_COMMIT_REQUIRED')
    }
    if (command.nodeId === '07')
      requireCondition(
        ['05', '06'].every(n => passed(v, n)),
        'DESIGN_REQUIRED',
      )
    if (command.nodeId === '17')
      requireCondition(
        ['14', '15', '16'].every(n => passed(v, n) && v.nodes[n]?.candidateCommit === command.candidateCommit),
        'DEVELOPMENT_INCOMPLETE',
      )
    if (command.nodeId === '22') {
      requireCondition(['uat', 'release'].includes(v.status), 'UAT_REQUIRED')
      const s = project.submissions.find(s => s.id === v.currentSubmissionId)
      requireCondition(s?.status === 'passed' && s.uat === 'passed' && s.baseline === baseline(v), 'UAT_REQUIRED')
      if (command.outcome === 'passed') v.status = 'release'
    }
    for (const id of command.artifactIds) {
      const doc = entity(project.artifacts, id)
      requireCondition(doc.scope.versionId === v.id, 'ARTIFACT_SCOPE_MISMATCH')
      requireCondition(doc.baseline === baseline(v) + (v.status === 'planning' ? 1 : 0), 'STALE_ARTIFACT')
    }
    const record = artifact(
      project,
      actor,
      { ...scope, versionId: v.id, nodeId: command.nodeId },
      definition.title,
      command.note,
      `review:${command.outcome}`,
    )
    const materials = command.nodeId === '07' ? ['05', '06'].flatMap(n => v.nodes[n]?.artifactIds ?? []) : []
    setNode(v, command.nodeId, command.outcome, command.note, actor, [
      ...new Set([...command.artifactIds, ...materials, record.id]),
    ])
    const recorded = v.nodes[command.nodeId]
    if (recorded) recorded.candidateCommit = command.candidateCommit
    if (command.nodeId === '15' && v.nodes['17']) v.nodes['17'].outcome = 'pending'
    return v.id
  }
  if (command.type === 'version.freeze') {
    requireRole(actor, 'product')
    const v = entity(project.versions, command.versionId)
    requireCondition(!['released', 'closed'].includes(v.status), 'VERSION_CLOSED')
    requireCondition(v.status === 'planning', 'FROZEN_SCOPE')
    requireCondition(
      v.requirementIds.length > 0 && ['05', '06', '07', '08', '09', '10'].every(n => passed(v, n)),
      'REVIEW_INCOMPLETE',
    )
    requireCondition(
      ['05', '06'].flatMap(n => v.nodes[n]?.artifactIds ?? []).every(id => v.nodes['07']?.artifactIds.includes(id)),
      'REVIEW_INCOMPLETE',
    )
    const requirements = v.requirementIds.map(id => entity(project.requirements, id))
    requireCondition(
      requirements.every(r => r.review === 'passed' && r.reviewedRevision === r.revision),
      'REVIEW_INCOMPLETE',
    )
    v.baselines.push({
      number: baseline(v) + 1,
      createdAt: new Date().toISOString(),
      artifactIds: [
        ...new Set(
          Object.entries(v.nodes)
            .filter(([key]) => Number(key) >= 5 && Number(key) <= 10)
            .flatMap(([, node]) => node.artifactIds),
        ),
      ],
      requirements: requirements.map(r => ({ id: r.id, revision: r.revision, artifactId: r.artifactId })),
    })
    const paused = project.tasks.filter(t => t.versionId === v.id && t.status === 'paused')
    for (const task of paused) {
      task.status = 'todo'
      task.baseline = baseline(v)
      task.workspaceId = null
    }
    v.status = paused.length ? 'development' : 'frozen'
    setNode(v, '11', 'passed', '范围已冻结', actor)
    return v.id
  }
  return undefined
}
