/** Requirement revisions, explicit membership and candidate version scope. */
import type { AuthActor, EntityId, ProjectState, WorkflowScope } from '@deepseek-ai/dsh-rd-contracts/types'
import { requirementDraftSchema } from '@deepseek-ai/dsh-rd-contracts'
import type { WorkflowCommand } from '@deepseek-ai/dsh-rd-contracts'
import { artifact, newId } from './workflow-engine.ts'
import { setNode } from './reviews.ts'
import { entity, requireCondition, requireRole } from './access-policy.ts'
/**
 * @param project - aggregate. @param command - business operation. @param scope - fixed context. @param actor
 * - author. @returns affected identity or undefined for another domain.
 */
export function applyRequirements(
  project: ProjectState,
  command: WorkflowCommand,
  scope: WorkflowScope,
  actor: AuthActor,
): EntityId | undefined {
  switch (command.type) {
    case 'requirement.saveDraft': {
      requireRole(actor, 'product')
      const draft = entity(project.artifacts, command.artifactId)
      requireCondition(
        draft.kind === 'draft.requirement' &&
          draft.scope.projectId === scope.projectId &&
          draft.scope.versionId === scope.versionId &&
          draft.scope.requirementId === scope.requirementId,
        'ARTIFACT_SCOPE_MISMATCH',
      )
      requireCondition(!project.artifacts.some(a => a.kind === `draft.saved:${draft.id}`), 'DRAFT_ALREADY_SAVED')
      const data = requirementDraftSchema.parse(JSON.parse(draft.text))
      if (data.requirementId)
        requireCondition(
          entity(project.requirements, data.requirementId).revision === data.sourceRequirementRevision,
          'STALE_ARTIFACT',
        )
      const fields = {
        title: command.title,
        content: command.content,
        acceptance: command.acceptance,
        priority: command.priority,
        ownerId: command.ownerId,
      }
      const requirementId = applyRequirements(
        project,
        data.requirementId
          ? { type: 'requirement.revise', requirementId: data.requirementId, ...fields }
          : { type: 'requirement.create', ...fields },
        scope,
        actor,
      )
      requireCondition(requirementId, 'NOT_FOUND')
      if (command.versionId) {
        requireCondition(
          !draft.scope.versionId || draft.scope.versionId === command.versionId,
          'ARTIFACT_SCOPE_MISMATCH',
        )
        applyRequirements(
          project,
          { type: 'version.assign', versionId: command.versionId, requirementId, included: true },
          scope,
          actor,
        )
      }
      artifact(
        project,
        actor,
        { ...scope, requirementId },
        '草稿保存记录',
        JSON.stringify({ artifactId: draft.id, requirementId }),
        `draft.saved:${draft.id}`,
      )
      return requirementId
    }
    case 'requirement.create': {
      requireRole(actor, 'product')
      const id = newId()
      const doc = artifact(
        project,
        actor,
        { ...scope, requirementId: id },
        command.title,
        `${command.content}\n\n验收标准\n${command.acceptance}`,
        'requirement',
      )
      project.requirements.push({
        id,
        title: command.title,
        content: command.content,
        acceptance: command.acceptance,
        priority: command.priority,
        revision: 1,
        ownerId: command.ownerId,
        artifactId: doc.id,
        review: 'pending',
        reviewedRevision: 0,
        versionId: null,
      })
      return id
    }
    case 'requirement.revise': {
      requireRole(actor, 'product')
      const r = entity(project.requirements, command.requirementId)
      if (r.versionId !== null) {
        const version = entity(project.versions, r.versionId)
        requireCondition(version.status === 'planning', 'FROZEN_SCOPE')
        for (const [key, result] of Object.entries(version.nodes))
          if (Number(key) >= 5 && Number(key) <= 11) result.outcome = 'pending'
      }
      const doc = artifact(
        project,
        actor,
        { ...scope, requirementId: r.id },
        command.title,
        `${command.content}\n\n验收标准\n${command.acceptance}`,
        'requirement',
      )
      Object.assign(r, {
        title: command.title,
        content: command.content,
        acceptance: command.acceptance,
        priority: command.priority,
        ownerId: command.ownerId,
        artifactId: doc.id,
        revision: r.revision + 1,
        review: 'pending',
        reviewedRevision: 0,
      })
      return r.id
    }
    case 'requirement.review': {
      requireRole(actor, 'product')
      const r = entity(project.requirements, command.requirementId)
      if (r.versionId !== null)
        requireCondition(entity(project.versions, r.versionId).status === 'planning', 'FROZEN_SCOPE')
      r.review = command.outcome
      r.reviewedRevision = r.revision
      if (r.versionId) {
        const v = entity(project.versions, r.versionId)
        setNode(
          v,
          '03',
          v.requirementIds.every((id) => {
            const item = entity(project.requirements, id)
            return item.review === 'passed' && item.reviewedRevision === item.revision
          })
            ? 'passed'
            : 'changes',
          command.note,
          actor,
        )
      }
      artifact(project, actor, { ...scope, requirementId: r.id }, '需求评审结论', command.note, 'review')
      return r.id
    }
    case 'version.assign': {
      requireRole(actor, 'product')
      const v = entity(project.versions, command.versionId),
        r = entity(project.requirements, command.requirementId)
      requireCondition(v.status === 'planning', 'FROZEN_SCOPE')
      if (command.included) {
        requireCondition(r.versionId === null || r.versionId === v.id, 'ALREADY_ASSIGNED')
        if (!v.requirementIds.includes(r.id)) v.requirementIds.push(r.id)
        r.versionId = v.id
      } else {
        requireCondition(r.versionId === v.id, 'NOT_ASSIGNED')
        v.requirementIds = v.requirementIds.filter(id => id !== r.id)
        r.versionId = null
      }
      for (const record of Object.values(v.nodes)) record.outcome = 'pending'
      for (const n of ['01', '02', '04'])
        setNode(v, n, v.requirementIds.length ? 'passed' : 'pending', '候选需求范围已更新', actor)
      if (
        v.requirementIds.length &&
        v.requirementIds.every((id) => {
          const item = entity(project.requirements, id)
          return item.review === 'passed' && item.reviewedRevision === item.revision
        })
      )
        setNode(v, '03', 'passed', '当前需求修订均已通过评审', actor)
      return v.id
    }
    default:
      return undefined
  }
}
