/** Authenticated Remote API over the R&D workflow repository. */
import { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type {
  LoginResult,
  WorkbenchSnapshot,
  CommandReceipt,
  WorkflowScope,
  Workspace,
  ProjectState,
  EntityId,
} from '@deepseek-ai/dsh-rd-contracts/types'
import { parseCommand } from '@deepseek-ai/dsh-rd-contracts'
import { requireCondition, requireRole } from './access-policy.ts'
import { WorkflowRepository } from './repository.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** R&D business operations with independent member authentication. */ rdWorkflow: RdWorkflow
  }
}
/** Deployment-owned persistence location. */
export interface Config {
  /** Absolute SQLite database filename. */ databasePath: string
}
/** Local project service. Harness transport authorization is required in addition to member login. */
export class RdWorkflow extends TypertRemoteService {
  /** Validated deployment configuration. */
  static Config: z<Config> = z.object({ databasePath: z.string().required() })
  /** Repository shared with the scoped AI runtime. */
  private readonly repository: WorkflowRepository
  /** Runtime consumers must reach quiescence before a scope mutation. */
  private readonly quiescers = new Set<(versionId: EntityId) => Promise<void>>()
  /** Runtime validators bind a submission to real Git commits. */
  private readonly candidateChecks = new Set<
    (workspaces: Workspace[], commit: string, fixes: string[]) => Promise<void>
  >()
  /** @param check - local candidate validation. @returns lifetime disposer. */
  beforeSubmission(check: (workspaces: Workspace[], commit: string, fixes: string[]) => Promise<void>): () => void {
    this.candidateChecks.add(check)
    return () => {
      this.candidateChecks.delete(check)
    }
  }
  /** Admission lock held while related execution is stopping. */
  private readonly blockedVersions = new Set<EntityId>()
  /** @param listener - execution owner. @returns lifetime disposer. */
  beforeScopeChange(listener: (versionId: EntityId) => Promise<void>): () => void {
    this.quiescers.add(listener)
    return () => {
      this.quiescers.delete(listener)
    }
  }
  /** @param versionId - selected execution scope. @returns when new writes can be admitted. */
  assertWritable(versionId: EntityId): void {
    requireCondition(!this.blockedVersions.has(versionId), 'SCOPE_PAUSED')
  }
  /** @param ctx - Cordis host. @param config - deployment database location. */
  constructor(ctx: Context, config: Config) {
    super(ctx, 'rdWorkflow', { namespace: 'rdWorkflow' })
    this.repository = new WorkflowRepository(config.databasePath)
    ctx.effect(
      () => () => {
        this.repository.close()
      },
      'rd-workflow: sqlite',
    )
  }
  /** @param token - member session. @param scope - requested context. @returns authorized project data. */
  context(token: string, scope: WorkflowScope): ProjectState {
    return this.repository.validateScope(scope, this.repository.authenticate(token))
  }
  /** @param token - member session. @param workspace - runtime-verified Git facts. */
  registerWorkspace(token: string, workspace: Workspace): void {
    this.repository.saveWorkspace(workspace, this.repository.authenticate(token))
  }
  /** @param token - member session. @param key - canonical context key. @returns existing owned Harness session. */
  sessionBinding(token: string, key: string): string | undefined {
    return this.repository.sessionBinding(key, this.repository.authenticate(token))
  }
  /** @param token - member session. @param key - canonical context key. @param id - Harness session identity. */
  bindSession(token: string, key: string, id: string): void {
    this.repository.bindSession(key, id, this.repository.authenticate(token))
  }
  /** @returns whether the first local account must be created. */
  @Remote
  needsSetup(): boolean {
    return this.repository.needsSetup()
  }
  /**
   * @param username - first account. @param name - display name. @param password - private credential. @param
   * projectName - project name. @returns member session.
   */
  @Remote
  bootstrap(username: string, name: string, password: string, projectName: string): LoginResult {
    return this.repository.bootstrap(username, name, password, projectName)
  }
  /** @param username - member account. @param password - private credential. @returns member session. */
  @Remote
  login(username: string, password: string): LoginResult {
    return this.repository.login(username, password)
  }
  /** @param token - session to invalidate. */
  @Remote
  logout(token: string): void {
    this.repository.logout(token)
  }
  /** @param token - member session. @returns authorized state. */
  @Remote
  snapshot(token: string): WorkbenchSnapshot {
    return this.repository.snapshot(this.repository.authenticate(token))
  }
  /** @param token - member session. @param json - command envelope validated before mutation. @returns durable result. */
  @Remote
  async execute(token: string, json: string): Promise<CommandReceipt> {
    const command = parseCommand(JSON.parse(json)),
      actor = this.repository.authenticate(token)
    const replay = this.repository.replay(command, actor)
    if (replay) return replay
    const project = this.repository.validateCommandTargets(command, actor)
    const payload = command.payload
    const candidate =
      payload.type === 'submission.create'
        ? payload.commit
        : ['node.submitEvidence', 'node.recordOutcome', 'review.decide'].includes(payload.type) &&
            'nodeId' in payload &&
            ['14', '15', '16', '17'].includes(payload.nodeId) &&
            'candidateCommit' in payload
          ? payload.candidateCommit
          : undefined
    const versionId =
      candidate && 'versionId' in payload
        ? payload.versionId
        : payload.type === 'submission.create'
          ? payload.versionId
          : payload.type === 'change.propose'
            ? payload.versionId
            : payload.type === 'change.decide' && payload.approved
              ? project.changes.find(c => c.id === payload.changeId && c.status === 'pending')?.versionId
              : payload.type === 'task.bindWorkspace' || payload.type === 'task.complete'
                ? project.tasks.find(t => t.id === payload.taskId)?.versionId
                : undefined
    if (!versionId) return this.repository.dispatch(command, actor)
    requireRole(actor, payload.type.startsWith('change.') ? 'product' : 'developer')
    requireCondition(project.revision === command.expectedRevision, 'STALE_REVISION')
    if ('taskId' in payload)
      requireCondition(
        project.tasks.find(t => t.id === payload.taskId)?.ownerId === actor.member.id,
        'TASK_OWNER_REQUIRED',
      )
    this.assertWritable(versionId)
    this.blockedVersions.add(versionId)
    try {
      await Promise.all([...this.quiescers].map(listener => listener(versionId)))
      if (candidate) {
        requireRole(actor, 'developer')
        requireCondition(project.revision === command.expectedRevision, 'STALE_REVISION')
        const workspaces = project.workspaces.filter(w =>
          project.tasks.some(t => t.versionId === versionId && t.workspaceId === w.id),
        )
        const fixes =
          payload.type === 'submission.create'
            ? project.defects.filter(d => d.versionId === versionId && d.status === 'fixed').map(d => d.fixCommit)
            : []
        requireCondition(this.candidateChecks.size > 0, 'RUNTIME_REQUIRED')
        await Promise.all([...this.candidateChecks].map(check => check(workspaces, candidate, fixes)))
      }
      return this.repository.dispatch(command, this.repository.authenticate(token))
    } finally {
      this.blockedVersions.delete(versionId)
    }
  }
}
export default RdWorkflow
