/** Durable business records for the local R&D workflow. */
import type { Branded } from '@deepseek-ai/dsh-brand'

/** Opaque local business entity identity. */
export type EntityId = Branded<'RdEntityId'>
/** Membership permissions, authenticated independently from Harness transport. */
export type Role = 'admin' | 'product' | 'developer' | 'tester'
/** Workflow stage identity. */
export type StageId = 'requirements' | 'design' | 'development' | 'testing' | 'release' | 'feedback'
/** Result of a workflow step for the current baseline. */
export type Outcome = 'pending' | 'passed' | 'changes' | 'rejected' | 'not-applicable'
/** Public membership without credential material. */
export interface Member {
  /** Stable record identity. */
  id: EntityId
  /** Owning project. */
  projectId: EntityId
  /** Human-readable name. */
  name: string
  /** Local sign-in identifier. */
  username: string
  /** Server-owned permissions. */
  roles: Role[]
}
/** Authenticated member passed by the server to the workflow. */
export interface AuthActor {
  /** Authenticated project member. */
  member: Member
}
/** Scope used to bind commands, artifacts and AI sessions. */
export interface WorkflowScope {
  /** Owning project. */
  projectId: EntityId
  /** Associated version, when assigned. */
  versionId?: EntityId | undefined
  /** Selected requirement identity. */
  requirementId?: EntityId | undefined
  /** Selected workflow stage. */
  stageId?: StageId | undefined
  /** Selected workflow node. */
  nodeId?: string | undefined
  /** Exact test batch identity. */
  submissionId?: EntityId | undefined
}
/** Immutable document revision. */
export interface Artifact {
  /** Stable record identity. */
  id: EntityId
  /** Human-readable title. */
  title: string
  /** Document or display text. */
  text: string
  /** Record classification. */
  kind: string
  /** Fixed business context. */
  scope: WorkflowScope
  /** Candidate baseline owning this document. */ baseline: number
  /** Project revision that created this immutable record. */
  revision: number
  /** Creation timestamp in ISO format. */
  createdAt: string
  /** Member who created this record. */
  createdBy: EntityId
}
/** One auditable node outcome referencing evidence. */
export interface NodeRecord {
  /** Exact code candidate reviewed by development gates; absent for other nodes. */
  candidateCommit?: string | undefined
  /** Recorded workflow decision. */
  outcome: Outcome
  /** Decision rationale or execution summary. */
  note: string
  /** Immutable supporting document identities. */
  artifactIds: EntityId[]
  /** Server-authenticated acting member. */
  actorId: EntityId
  /** Frozen version baseline number. */
  baseline: number
  /** Last recorded transition time. */
  updatedAt: string
}
/** Requirement revisions and their review are independent of version membership. */
export interface Requirement {
  /** Stable record identity. */
  id: EntityId
  /** Human-readable title. */
  title: string
  /** Requirement or document body. */
  content: string
  /** Explicit acceptance criteria. */
  acceptance: string
  /** Planning priority. */
  priority: 'P0' | 'P1' | 'P2'
  /** Persisted optimistic revision. */
  revision: number
  /** Responsible project member. */
  ownerId: EntityId
  /** Source document revision identity. */
  artifactId: EntityId
  /** Current requirement review outcome. */
  review: Outcome
  /** Requirement revision actually reviewed. */
  reviewedRevision: number
  /** Associated version, when assigned. */
  versionId: EntityId | null
}
/** Frozen, immutable requirement revision references. */
export interface Baseline {
  /** Sequential frozen baseline number. */
  number: number
  /** Creation timestamp in ISO format. */
  createdAt: string
  /** Exact reviewed design and test materials. */ artifactIds: EntityId[]
  /** Exact requirement revisions included in the frozen scope. */
  requirements: { id: EntityId; revision: number; artifactId: EntityId }[]
}
/** Version aggregate with explicit quality and release states. */
export interface Version {
  /** Stable record identity. */
  id: EntityId
  /** Human-readable title. */
  title: string
  /** Human-selected delivery date. */
  targetDate: string
  /** Responsible project member. */
  ownerId: EntityId
  /** Current version scope identities. */
  requirementIds: EntityId[]
  /** Current domain or execution state. */
  status: 'planning' | 'frozen' | 'development' | 'testing' | 'uat' | 'release' | 'released' | 'closed'
  /** Immutable frozen scope history. */
  baselines: Baseline[]
  /** Per-node decisions and supporting evidence. */
  nodes: Record<string, NodeRecord>
  /** Active candidate awaiting testing or acceptance. */
  currentSubmissionId: EntityId | null
  /** Latest externally recorded full release evidence. */
  releaseEvidence: string
}
/** Development task bound to one real local workspace. */
export interface DevelopmentTask {
  /** Stable record identity. */
  id: EntityId
  /** Associated version, when assigned. */
  versionId: EntityId
  /** Human-readable title. */
  title: string
  /** Responsible project member. */
  ownerId: EntityId
  /** Explicitly selected local checkout. */
  workspaceId: EntityId | null
  /** Current domain or execution state. */
  status: 'todo' | 'working' | 'done' | 'paused'
  /** Frozen version baseline number. */
  baseline: number
}
/** Validated local Git checkout and selected branch. */
export interface Workspace {
  /** Stable record identity. */
  id: EntityId
  /** Human-readable name. */
  name: string
  /** Canonical local checkout path. */
  path: string
  /** Verified execution branch. */
  branch: string
  /** Verified Git commit. */
  head: string
  /** Whether the checkout contains uncommitted changes. */
  dirty: boolean
  /** Execution host supported by this pilot. */
  host: 'local'
  /** Last filesystem verification time. */
  checkedAt: string
}
/** Immutable submitted build and the mutable test decision attached to it. */
export interface Submission {
  /** Stable record identity. */
  id: EntityId
  /** Associated version, when assigned. */
  versionId: EntityId
  /** Frozen version baseline number. */
  baseline: number
  /** Full candidate or fix commit SHA. */
  commit: string
  /** External build or artifact reference. */
  artifact: string
  /** Named test or release environment. */
  environment: string
  /** Developer self-test evidence. */
  selfTest: string
  /** Creation timestamp in ISO format. */
  createdAt: string
  /** Independent test cases for this exact batch. */
  cases: { id: EntityId; title: string; result: 'pending' | 'passed' | 'failed'; evidence: string }[]
  /** Current domain or execution state. */
  status: 'testing' | 'passed' | 'rejected' | 'superseded'
  /** Separate product acceptance decision. */
  uat: Outcome
  /** Evidence for product acceptance. */
  uatEvidence: string
}
/** Defect repair and independent test verification. */
export interface Defect {
  /** Stable record identity. */
  id: EntityId
  /** Associated version, when assigned. */
  versionId: EntityId
  /** Exact test batch identity. */
  submissionId: EntityId
  /** Human-readable title. */
  title: string
  /** Defect impact classification. */
  severity: 'blocker' | 'major' | 'minor'
  /** Current domain or execution state. */
  status: 'open' | 'fixed' | 'closed'
  /** Recorded verification evidence. */
  evidence: string
  /** Exact submitted fix commit. */
  fixCommit: string
  /** New test batch that verified the fix. */
  verifiedSubmissionId: EntityId | null
}
/** Cross-stage change with explicit scope and human approval. */
export interface ChangeRequest {
  /** Stable record identity. */
  id: EntityId
  /** Associated version, when assigned. */
  versionId: EntityId
  /** Selected requirement identity. */
  requirementId: EntityId
  /** Human-readable title. */
  title: string
  /** Requirement or document body. */
  content: string
  /** Explicit acceptance criteria. */
  acceptance: string
  /** Change impact explanation. */
  impact: string
  /** Nodes requiring renewed decisions. */
  affectedNodes: string[]
  /** Current domain or execution state. */
  status: 'pending' | 'approved' | 'rejected'
  /** Member who created this record. */
  createdBy: EntityId
  /** Human approval rationale. */
  decision: string
}
/** Successful business operation in its committed order. */
export interface Activity {
  /** Compact business status before the command; absent in early pilot records. */
  beforeState?: string | undefined
  /** Compact business status after the command. */
  afterState?: string | undefined
  /** Stable record identity. */
  id: EntityId
  /** Recorded operation timestamp. */
  at: string
  /** Server-authenticated acting member. */
  actorId: EntityId
  /** Business command name. */
  command: string
  /** Changed business object. */
  entityId: EntityId
  /** Compact activity description. */
  summary: string
  /** Persisted optimistic revision. */
  revision: number
}
/** Durable project aggregate; secrets and session tokens never enter this value. */
export interface ProjectState {
  /** Stable record identity. */
  id: EntityId
  /** Human-readable name. */
  name: string
  /** Persisted optimistic revision. */
  revision: number
  /** Requirements included in this record. */
  requirements: Requirement[]
  /** Planned and delivered project versions. */
  versions: Version[]
  /** Development tasks and selected workspaces. */
  tasks: DevelopmentTask[]
  /** All candidate test batches. */
  submissions: Submission[]
  /** Reported defects and regression status. */
  defects: Defect[]
  /** Version change requests. */
  changes: ChangeRequest[]
  /** Immutable document history. */
  artifacts: Artifact[]
  /** Auditable command history. */
  activities: Activity[]
  /** Verified available local checkouts. */
  workspaces: Workspace[]
}
/** Initial read plus current membership used by the workbench. */
export interface WorkbenchSnapshot {
  /** Absolute Markdown directory on the execution host, empty for an in-memory store. */
  documentDirectory: string
  /** Authorized project aggregate. */
  project: ProjectState
  /** Public project membership. */
  members: Member[]
  /** Current authenticated member. */
  actor: Member
  /** Six-stage workflow template. */
  stages: {
    id: StageId
    title: string
    nodes: { id: string; title: string; role: Role; mode: 'record' | 'approval' | 'derived' }[]
  }[]
}
/** Idempotent optimistic command envelope. */
export interface CommandEnvelope<T> {
  /** Idempotency key retained across retries. */
  commandId: string
  /** Fixed business context. */
  scope: WorkflowScope
  /** Required aggregate revision before applying the command. */
  expectedRevision: number
  /** Validated business command body. */
  payload: T
}
/** A rejected command never advances the project revision. */
export interface CommandReceipt {
  /** Idempotency key retained across retries. */
  commandId: string
  /** Current domain or execution state. */
  status: 'applied' | 'replayed' | 'rejected'
  /** Changed business object. */
  entityId: EntityId
  /** Persisted optimistic revision. */
  revision: number
  /** Immutable supporting document identities. */
  artifactIds: EntityId[]
  /** Stable rejected-operation code. */
  errorCode?: string | undefined
  /** User-facing result details. */
  message?: string | undefined
}
/** Locally authenticated login result. */
export interface LoginResult {
  /** Private short-lived local login credential. */
  token: string
  /** Authenticated project member. */
  member: Member
}
