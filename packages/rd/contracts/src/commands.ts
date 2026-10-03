/** Validate untrusted command JSON before it reaches business logic. */
import { z } from 'zod'
import type { CommandEnvelope, EntityId } from './types.ts'

const id = z
  .string()
  .min(1)
  .max(200)
  .transform(value => value as EntityId)
const text = z.string().trim().min(1).max(100_000)
const node = z.string().regex(/^(0[1-9]|[12][0-9]|3[01])$/)
const candidateCommit = z
  .string()
  .regex(/^[a-f0-9]{40}$/)
  .optional()
const roles = z.array(z.enum(['admin', 'product', 'developer', 'tester'])).min(1)
const requirementFields = {
  title: text.max(200),
  content: text,
  acceptance: text,
  priority: z.enum(['P0', 'P1', 'P2']),
  ownerId: id,
}
/** Structured draft provenance is fixed when the model creates it. */
export const requirementDraftSchema = z.object({
  title: text.max(200),
  content: text,
  acceptance: text,
  requirementId: id.nullable(),
  sourceRequirementRevision: z.number().int().nonnegative(),
})
/** The complete local business command vocabulary. */
export const commandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('requirement.create'), ...requirementFields }),
  z.object({
    type: z.literal('requirement.saveDraft'),
    artifactId: id,
    ...requirementFields,
    versionId: id.optional(),
  }),
  z.object({ type: z.literal('requirement.revise'), requirementId: id, ...requirementFields }),
  z.object({
    type: z.literal('requirement.review'),
    requirementId: id,
    outcome: z.enum(['passed', 'changes', 'rejected']),
    note: text,
  }),
  z.object({ type: z.literal('version.create'), title: text.max(200), targetDate: z.string().max(50), ownerId: id }),
  z.object({ type: z.literal('version.assign'), versionId: id, requirementId: id, included: z.boolean() }),
  z.object({ type: z.literal('artifact.createRevision'), title: text.max(200), text, kind: text.max(100) }),
  z.object({
    type: z.literal('node.submitEvidence'),
    candidateCommit,
    versionId: id,
    nodeId: node,
    note: text,
    evidence: text,
    outcome: z.enum(['passed', 'changes', 'rejected', 'not-applicable']),
  }),
  z.object({ type: z.literal('node.attachArtifact'), versionId: id, nodeId: node, artifactId: id }),
  z.object({
    type: z.literal('node.recordOutcome'),
    candidateCommit,
    versionId: id,
    nodeId: node,
    note: text,
    artifactIds: z.array(id).min(1),
  }),
  z.object({
    type: z.literal('review.decide'),
    candidateCommit,
    versionId: id,
    nodeId: node,
    outcome: z.enum(['passed', 'changes', 'rejected', 'not-applicable']),
    note: text,
    artifactIds: z.array(id),
  }),
  z.object({ type: z.literal('version.freeze'), versionId: id }),
  z.object({ type: z.literal('task.create'), versionId: id, title: text.max(200), ownerId: id }),
  z.object({ type: z.literal('task.bindWorkspace'), taskId: id, workspaceId: id }),
  z.object({ type: z.literal('task.complete'), taskId: id, note: text }),
  z.object({
    type: z.literal('submission.create'),
    versionId: id,
    commit: z.string().regex(/^[a-f0-9]{40}$/),
    artifact: text,
    environment: text,
    selfTest: text,
  }),
  z.object({ type: z.literal('testCase.add'), submissionId: id, title: text.max(500) }),
  z.object({
    type: z.literal('testCase.record'),
    submissionId: id,
    caseId: id,
    result: z.enum(['passed', 'failed']),
    evidence: text,
  }),
  z.object({
    type: z.literal('defect.create'),
    submissionId: id,
    title: text.max(500),
    severity: z.enum(['blocker', 'major', 'minor']),
    evidence: text,
  }),
  z.object({ type: z.literal('defect.fix'), defectId: id, commit: z.string().regex(/^[a-f0-9]{40}$/), evidence: text }),
  z.object({ type: z.literal('defect.verify'), defectId: id, submissionId: id, passed: z.boolean(), evidence: text }),
  z.object({ type: z.literal('submission.exit'), submissionId: id, passed: z.boolean(), evidence: text }),
  z.object({ type: z.literal('uat.decide'), submissionId: id, passed: z.boolean(), evidence: text }),
  z.object({
    type: z.literal('release.record'),
    versionId: id,
    evidence: text,
    environment: text,
    kind: z.enum(['gray', 'full', 'verify', 'rollback', 'hotfix']),
  }),
  z.object({ type: z.literal('version.close'), versionId: id, retrospective: text, knowledge: text }),
  z.object({
    type: z.literal('change.propose'),
    versionId: id,
    requirementId: id,
    title: text.max(200),
    content: text,
    acceptance: text,
    impact: text,
    affectedNodes: z.array(node).min(1),
  }),
  z.object({ type: z.literal('change.decide'), changeId: id, approved: z.boolean(), note: text }),
  z.object({
    type: z.literal('member.create'),
    username: z.string().regex(/^[a-zA-Z0-9._-]{3,60}$/),
    name: text.max(80),
    password: z.string().min(12).max(200),
    roles,
  }),
])
/** A checked command payload used by both UI and model tools. */
export type WorkflowCommand = z.infer<typeof commandSchema>
const envelopeSchema = z.object({
  commandId: z.string().min(1).max(200),
  expectedRevision: z.number().int().nonnegative(),
  scope: z.object({
    projectId: id,
    versionId: id.optional(),
    requirementId: id.optional(),
    stageId: z.enum(['requirements', 'design', 'development', 'testing', 'release', 'feedback']).optional(),
    nodeId: node.optional(),
    submissionId: id.optional(),
  }),
  payload: commandSchema,
})
/**
 * Parse a wire request and reject malformed fields before any transaction.
 * @param value - untrusted request JSON.
 * @returns validated business command.
 */
export function parseCommand(value: unknown): CommandEnvelope<WorkflowCommand> {
  return envelopeSchema.parse(value)
}
