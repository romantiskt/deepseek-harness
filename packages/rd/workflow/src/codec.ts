/** Database JSON validation; invalid or future stored data fails explicitly. */
import { z } from 'zod'
import type { ProjectState, Member, CommandReceipt } from '@deepseek-ai/dsh-rd-contracts/types'
const id = z.string().min(1)
const outcome = z.enum(['pending', 'passed', 'changes', 'rejected', 'not-applicable'])
const scope = z.object({
  projectId: id,
  versionId: id.optional(),
  requirementId: id.optional(),
  stageId: z.string().optional(),
  nodeId: z.string().optional(),
  submissionId: id.optional(),
})
const node = z.object({
  candidateCommit: z
    .string()
    .regex(/^[a-f0-9]{40}$/)
    .optional(),
  outcome,
  note: z.string(),
  artifactIds: z.array(id),
  actorId: id,
  baseline: z.number(),
  updatedAt: z.string(),
})
const project = z.object({
  id,
  name: z.string(),
  revision: z.number().int().nonnegative(),
  requirements: z.array(
    z.object({
      id,
      title: z.string(),
      content: z.string(),
      acceptance: z.string(),
      priority: z.enum(['P0', 'P1', 'P2']),
      revision: z.number(),
      ownerId: id,
      artifactId: id,
      review: outcome,
      reviewedRevision: z.number(),
      versionId: id.nullable(),
    }),
  ),
  versions: z.array(
    z.object({
      id,
      title: z.string(),
      targetDate: z.string(),
      ownerId: id,
      requirementIds: z.array(id),
      status: z.enum(['planning', 'frozen', 'development', 'testing', 'uat', 'release', 'released', 'closed']),
      baselines: z.array(
        z.object({
          number: z.number(),
          createdAt: z.string(),
          artifactIds: z.array(id).default([]),
          requirements: z.array(z.object({ id, revision: z.number(), artifactId: id })),
        }),
      ),
      nodes: z.record(z.string(), node),
      currentSubmissionId: id.nullable(),
      releaseEvidence: z.string(),
    }),
  ),
  tasks: z.array(
    z.object({
      id,
      versionId: id,
      title: z.string(),
      ownerId: id,
      workspaceId: id.nullable(),
      status: z.enum(['todo', 'working', 'done', 'paused']),
      baseline: z.number(),
    }),
  ),
  submissions: z.array(
    z.object({
      id,
      versionId: id,
      baseline: z.number(),
      commit: z.string(),
      artifact: z.string(),
      environment: z.string(),
      selfTest: z.string(),
      createdAt: z.string(),
      cases: z.array(
        z.object({ id, title: z.string(), result: z.enum(['pending', 'passed', 'failed']), evidence: z.string() }),
      ),
      status: z.enum(['testing', 'passed', 'rejected', 'superseded']),
      uat: outcome,
      uatEvidence: z.string(),
    }),
  ),
  defects: z.array(
    z.object({
      id,
      versionId: id,
      submissionId: id,
      title: z.string(),
      severity: z.enum(['blocker', 'major', 'minor']),
      status: z.enum(['open', 'fixed', 'closed']),
      evidence: z.string(),
      fixCommit: z.string(),
      verifiedSubmissionId: id.nullable(),
    }),
  ),
  changes: z.array(
    z.object({
      id,
      versionId: id,
      requirementId: id,
      title: z.string(),
      content: z.string(),
      acceptance: z.string(),
      impact: z.string(),
      affectedNodes: z.array(z.string()),
      status: z.enum(['pending', 'approved', 'rejected']),
      createdBy: id,
      decision: z.string(),
    }),
  ),
  artifacts: z.array(
    z.object({
      id,
      title: z.string(),
      text: z.string(),
      kind: z.string(),
      scope,
      baseline: z.number().default(0),
      revision: z.number(),
      createdAt: z.string(),
      createdBy: id,
    }),
  ),
  activities: z.array(
    z.object({
      id,
      at: z.string(),
      actorId: id,
      command: z.string(),
      entityId: id,
      summary: z.string(),
      beforeState: z.string().optional(),
      afterState: z.string().optional(),
      revision: z.number(),
    }),
  ),
  workspaces: z.array(
    z.object({
      id,
      name: z.string(),
      path: z.string(),
      branch: z.string(),
      head: z.string(),
      dirty: z.boolean(),
      host: z.literal('local'),
      checkedAt: z.string(),
    }),
  ),
})
/** @param raw - SQLite JSON. @returns validated project with owner-created opaque IDs. */
export function readProject(raw: string): ProjectState {
  return project.parse(JSON.parse(raw)) as ProjectState
}
/** @param raw - public membership JSON. @returns validated membership. */
export function readMember(raw: string): Member {
  return z
    .object({
      id,
      projectId: id,
      name: z.string(),
      username: z.string(),
      roles: z.array(z.enum(['admin', 'product', 'developer', 'tester'])),
    })
    .parse(JSON.parse(raw)) as Member
}
/** @param raw - previously committed receipt. @returns validated receipt. */
export function readReceipt(raw: string): CommandReceipt {
  return z
    .object({
      commandId: z.string(),
      status: z.enum(['applied', 'replayed', 'rejected']),
      entityId: id,
      revision: z.number(),
      artifactIds: z.array(id),
      errorCode: z.string().optional(),
      message: z.string().optional(),
    })
    .parse(JSON.parse(raw)) as CommandReceipt
}
