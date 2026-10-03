/** Pure project mutations; the repository supplies transaction and identity. */
import { randomUUID } from 'node:crypto'
import type {
  AuthActor,
  EntityId,
  ProjectState,
  WorkflowScope,
  Artifact,
  Version,
} from '@deepseek-ai/dsh-rd-contracts/types'
import type { WorkflowCommand } from '@deepseek-ai/dsh-rd-contracts'
import { entity, requireCondition, requireRole, WorkflowError } from './access-policy.ts'
import { applyRequirements } from './requirements.ts'
import { applyDeliveries } from './deliveries.ts'
import { applyRelease } from './release-records.ts'
import { applyChanges } from './changes.ts'
import { passed, applyReviews } from './reviews.ts'
import { workflowTemplate } from './workflow-template.ts'
/** @returns a fresh opaque business ID. */
export function newId(): EntityId {
  return randomUUID() as EntityId
}
/**
 * @param project - mutable aggregate. @param actor - authenticated author. @param scope - fixed artifact
 * scope. @param title - heading. @param text - immutable content. @param kind - business purpose. @returns
 * immutable artifact.
 */
export function artifact(
  project: ProjectState,
  actor: AuthActor,
  scope: WorkflowScope,
  title: string,
  text: string,
  kind: string,
): Artifact {
  const version = project.versions.find(v => v.id === scope.versionId)
  const documentBaseline = version ? baseline(version) + (version.status === 'planning' ? 1 : 0) : 0
  const value: Artifact = {
    id: newId(),
    title,
    text,
    kind,
    scope: { ...scope },
    baseline: documentBaseline,
    revision: project.revision + 1,
    createdAt: new Date().toISOString(),
    createdBy: actor.member.id,
  }
  project.artifacts.push(value)
  return value
}
/** @param version - current version. @returns latest baseline number, zero while planning. */
export function baseline(version: Version): number {
  return version.baselines.at(-1)?.number ?? 0
}
/**
 * @param project - project being mutated. @param command - validated operation. @param scope - fixed context.
 * @param actor - authenticated author. @returns changed object ID.
 */
export function applyCommand(
  project: ProjectState,
  command: WorkflowCommand,
  scope: WorkflowScope,
  actor: AuthActor,
): EntityId {
  const domainResult =
    applyRequirements(project, command, scope, actor) ??
    applyReviews(project, command, scope, actor) ??
    applyDeliveries(project, command, scope, actor) ??
    applyRelease(project, command, scope, actor) ??
    applyChanges(project, command, scope, actor)
  if (domainResult !== undefined) return domainResult
  switch (command.type) {
    case 'version.create': {
      requireRole(actor, 'product')
      const id = newId()
      project.versions.push({
        id,
        title: command.title,
        ownerId: command.ownerId,
        targetDate: command.targetDate,
        requirementIds: [],
        status: 'planning',
        baselines: [],
        nodes: {},
        currentSubmissionId: null,
        releaseEvidence: '',
      })
      return id
    }
    case 'artifact.createRevision':
      return artifact(project, actor, scope, command.title, command.text, command.kind).id
    case 'node.submitEvidence': {
      const definition = workflowTemplate.flatMap(s => s.nodes).find(n => n.id === command.nodeId)
      requireCondition(definition && definition.mode !== 'derived', 'SPECIAL_ACTION_REQUIRED')
      requireRole(actor, definition.role)
      const evidence = artifact(
        project,
        actor,
        { ...scope, versionId: command.versionId, nodeId: command.nodeId },
        definition.title,
        command.evidence,
        'evidence',
      )
      return applyCommand(
        project,
        definition.mode === 'approval'
          ? {
            type: 'review.decide',
            versionId: command.versionId,
            nodeId: command.nodeId,
            note: command.note,
            outcome: command.outcome,
            artifactIds: [evidence.id],
            candidateCommit: command.candidateCommit,
          }
          : {
            type: 'node.recordOutcome',
            versionId: command.versionId,
            nodeId: command.nodeId,
            note: command.note,
            artifactIds: [evidence.id],
            candidateCommit: command.candidateCommit,
          },
        scope,
        actor,
      )
    }
    case 'node.attachArtifact': {
      const version = entity(project.versions, command.versionId)
      requireCondition(version.status !== 'closed', 'VERSION_CLOSED')
      if (Number(command.nodeId) <= 10) requireCondition(version.status === 'planning', 'FROZEN_SCOPE')
      const evidence = entity(project.artifacts, command.artifactId)
      requireCondition(evidence.scope.versionId === version.id, 'ARTIFACT_SCOPE_MISMATCH')
      const definition = workflowTemplate.flatMap(s => s.nodes).find(n => n.id === command.nodeId)
      requireCondition(definition, 'UNKNOWN_NODE')
      requireRole(actor, definition.role)
      if (['05', '06'].includes(command.nodeId) && version.nodes['07']) version.nodes['07'].outcome = 'pending'
      const previous = version.nodes[command.nodeId]
      version.nodes[command.nodeId] = {
        outcome: 'pending',
        note: '',
        actorId: actor.member.id,
        baseline: baseline(version),
        artifactIds: [...new Set([...(previous?.artifactIds ?? []), evidence.id])],
        updatedAt: new Date().toISOString(),
      }
      return version.id
    }
    case 'node.recordOutcome': {
      const definition = workflowTemplate.flatMap(s => s.nodes).find(n => n.id === command.nodeId)
      requireCondition(definition?.mode === 'record', 'SPECIAL_ACTION_REQUIRED')
      requireRole(actor, definition.role)
      const version = entity(project.versions, command.versionId)
      requireCondition(version.status !== 'closed', 'VERSION_CLOSED')
      if (Number(command.nodeId) <= 10) requireCondition(version.status === 'planning', 'FROZEN_SCOPE')
      if (['14', '16'].includes(command.nodeId)) {
        requireCondition(version.status === 'development' && passed(version, '13'), 'DEVELOPMENT_INCOMPLETE')
        requireCondition(command.candidateCommit, 'CANDIDATE_COMMIT_REQUIRED')
      }
      if (command.nodeId === '23')
        requireCondition(version.status === 'release' && passed(version, '22'), 'RELEASE_NOT_READY')
      if (command.nodeId === '25')
        requireCondition(passed(version, '24') && version.status === 'release', 'GRAY_RELEASE_REQUIRED')
      if (['28', '31'].includes(command.nodeId))
        requireCondition(version.status === 'released' && passed(version, '27'), 'RELEASE_VERIFICATION_REQUIRED')
      for (const id of command.artifactIds) {
        const doc = entity(project.artifacts, id)
        requireCondition(doc.scope.versionId === version.id, 'ARTIFACT_SCOPE_MISMATCH')
        requireCondition(doc.baseline === baseline(version) + (version.status === 'planning' ? 1 : 0), 'STALE_ARTIFACT')
      }
      if (['05', '06'].includes(command.nodeId) && version.nodes['07']) version.nodes['07'].outcome = 'pending'
      if (['14', '16'].includes(command.nodeId) && version.nodes['17']) version.nodes['17'].outcome = 'pending'
      version.nodes[command.nodeId] = {
        candidateCommit: command.candidateCommit,
        outcome: 'passed',
        note: command.note,
        artifactIds: command.artifactIds,
        actorId: actor.member.id,
        baseline: baseline(version),
        updatedAt: new Date().toISOString(),
      }
      return version.id
    }
    default:
      throw new WorkflowError('NOT_IMPLEMENTED', `Operation ${command.type} is not available`)
  }
}
