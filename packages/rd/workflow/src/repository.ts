/** SQLite-backed authentication and transactional business command dispatcher. */
import { DatabaseSync } from 'node:sqlite'
import { randomBytes, createHash, scryptSync, timingSafeEqual } from 'node:crypto'
import { chmodSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { parseCommand } from '@deepseek-ai/dsh-rd-contracts'
import type { WorkflowCommand } from '@deepseek-ai/dsh-rd-contracts'
import type {
  AuthActor,
  CommandEnvelope,
  CommandReceipt,
  EntityId,
  LoginResult,
  Member,
  ProjectState,
  WorkbenchSnapshot,
  Workspace,
  WorkflowScope,
} from '@deepseek-ai/dsh-rd-contracts/types'
import { applyCommand, newId } from './workflow-engine.ts'
import { WorkflowError, requireCondition, requireRole } from './access-policy.ts'
import { readMember, readProject, readReceipt } from './codec.ts'
import { workflowTemplate } from './workflow-template.ts'

/** @param value - token or command bytes. @returns non-reversible lookup digest. */
function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}
/** Slow down verification of secret-bearing account commands as well as password login. */
function commandFingerprint(command: CommandEnvelope<WorkflowCommand>, memberId: EntityId): string {
  const bytes = JSON.stringify({ ...command, memberId })
  return command.payload.type === 'member.create'
    ? scryptSync(bytes, `rd-command:${command.commandId}`, 32).toString('hex')
    : digest(bytes)
}
/** Keep status transitions reviewable without persisting credentials or duplicating document content. */
function auditState(project: ProjectState): string {
  return JSON.stringify({
    revision: project.revision,
    requirements: project.requirements.map(r => ({
      id: r.id,
      revision: r.revision,
      review: r.review,
      version: r.versionId,
    })),
    versions: project.versions.map(v => ({
      id: v.id,
      status: v.status,
      baseline: v.baselines.at(-1)?.number ?? 0,
      submission: v.currentSubmissionId,
      nodes: Object.fromEntries(Object.entries(v.nodes).map(([id, n]) => [id, n.outcome])),
    })),
    tasks: project.tasks.map(t => ({ id: t.id, status: t.status, workspace: t.workspaceId })),
    submissions: project.submissions.map(s => ({ id: s.id, status: s.status, uat: s.uat })),
    defects: project.defects.map(d => ({ id: d.id, status: d.status })),
    changes: project.changes.map(c => ({ id: c.id, status: c.status })),
  })
}
/** Single-host workflow database; every domain write goes through dispatch. */
export class WorkflowRepository {
  /** Single SQLite connection owning synchronous transactions. */
  private readonly db: DatabaseSync
  /** @param path - local SQLite filename or isolated in-memory test store. */
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
    this.db = new DatabaseSync(path)
    if (path !== ':memory:') chmodSync(path, 0o600)
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;')
    const schema = this.db.prepare('PRAGMA user_version').get()
    requireCondition(Number(schema?.user_version) <= 1, 'FUTURE_SCHEMA')
    this.db.exec(`CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS members (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), username TEXT UNIQUE NOT NULL, salt TEXT NOT NULL, hash TEXT NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS logins (hash TEXT PRIMARY KEY, member_id TEXT NOT NULL REFERENCES members(id), expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS commands (project_id TEXT NOT NULL REFERENCES projects(id), id TEXT NOT NULL, fingerprint TEXT NOT NULL, receipt TEXT NOT NULL, PRIMARY KEY(project_id,id));
      CREATE TABLE IF NOT EXISTS session_bindings (id TEXT PRIMARY KEY, member_id TEXT NOT NULL, scope TEXT NOT NULL, session_id TEXT NOT NULL, UNIQUE(member_id,scope));
      PRAGMA user_version=1;`)
  }
  /** Close the database after its owning plugin stops accepting work. */
  close(): void {
    this.db.close()
  }
  /** @returns whether first-time administrator setup is needed. */
  needsSetup(): boolean {
    return Number(this.db.prepare('SELECT count(*) AS total FROM members').get()?.total) === 0
  }
  /**
   * @param username - first local account. @param name - display name. @param password - private password.
   * @param projectName - initial project. @returns authenticated first membership.
   */
  bootstrap(username: string, name: string, password: string, projectName: string): LoginResult {
    requireCondition(projectName.trim().length > 0 && projectName.length <= 200, 'INVALID_PROJECT')
    this.db.exec('BEGIN IMMEDIATE')
    try {
      requireCondition(this.needsSetup(), 'ALREADY_CONFIGURED')
      const id = newId()
      const state: ProjectState = {
        id,
        name: projectName,
        revision: 0,
        requirements: [],
        versions: [],
        tasks: [],
        submissions: [],
        defects: [],
        changes: [],
        artifacts: [],
        activities: [],
        workspaces: [],
      }
      this.db.prepare('INSERT INTO projects VALUES (?,?)').run(id, JSON.stringify(state))
      this.createMember(id, username, name, password, ['admin', 'product', 'developer', 'tester'])
      this.db.exec('COMMIT')
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
    return this.login(username, password)
  }
  /**
   * @param username - local account name. @param password - submitted credential. @returns short-lived opaque
   * session and public membership.
   */
  login(username: string, password: string): LoginResult {
    requireCondition(password.length <= 200 && username.length <= 60, 'INVALID_LOGIN')
    const row = this.db.prepare('SELECT salt,hash,data,id FROM members WHERE username=?').get(username)
    const salt = row === undefined ? 'unknown-account' : String(row.salt)
    const hash = scryptSync(password, salt, 64)
    const expected = row === undefined ? Buffer.alloc(64) : Buffer.from(String(row.hash), 'hex')
    requireCondition(timingSafeEqual(hash, expected) && row !== undefined, 'INVALID_LOGIN')
    const token = randomBytes(32).toString('hex')
    this.db
      .prepare('INSERT INTO logins VALUES (?,?,?)')
      .run(digest(token), String(row.id), Date.now() + 12 * 60 * 60 * 1000)
    return { token, member: readMember(String(row.data)) }
  }
  /** @param token - private opaque session token. @returns current server-owned membership. */
  authenticate(token: string): AuthActor {
    const row = this.db
      .prepare('SELECT m.data FROM logins l JOIN members m ON m.id=l.member_id WHERE l.hash=? AND l.expires>?')
      .get(digest(token), Date.now())
    requireCondition(row, 'UNAUTHENTICATED')
    return { member: readMember(String(row.data)) }
  }
  /** @param token - session to invalidate. */
  logout(token: string): void {
    this.db.prepare('DELETE FROM logins WHERE hash=?').run(digest(token))
  }
  /** @param actor - authenticated server actor. @returns project and members without secrets. */
  snapshot(actor: AuthActor): WorkbenchSnapshot {
    const current = this.currentActor(actor)
    const row = this.db.prepare('SELECT data FROM projects WHERE id=?').get(current.member.projectId)
    requireCondition(row, 'FORBIDDEN')
    const members = this.db
      .prepare('SELECT data FROM members WHERE project_id=?')
      .all(current.member.projectId)
      .map(r => readMember(String(r.data)))
    return { project: readProject(String(row.data)), members, actor: current.member, stages: workflowTemplate }
  }
  /**
   * @param input - exact retry envelope. @param actor - current authenticated member. @returns an already
   * committed receipt before execution side effects.
   */
  replay(input: CommandEnvelope<WorkflowCommand>, actor: AuthActor): CommandReceipt | undefined {
    const command = parseCommand(input),
      current = this.currentActor(actor)
    requireCondition(current.member.projectId === command.scope.projectId, 'FORBIDDEN')
    const row = this.db
      .prepare('SELECT fingerprint,receipt FROM commands WHERE project_id=? AND id=?')
      .get(command.scope.projectId, command.commandId)
    if (!row) return undefined
    requireCondition(row.fingerprint === commandFingerprint(command, current.member.id), 'IDEMPOTENCY_CONFLICT')
    return { ...readReceipt(String(row.receipt)), status: 'replayed' }
  }
  /**
   * @param input - typed or decoded command, revalidated at this public write entry. @param actor -
   * authenticated server actor. @returns committed, replayed or rejected result.
   */
  dispatch(input: CommandEnvelope<WorkflowCommand>, actor: AuthActor): CommandReceipt {
    const command = parseCommand(input)
    const rejection = (code: string): CommandReceipt => ({
      commandId: command.commandId,
      status: 'rejected',
      entityId: command.scope.projectId,
      revision: command.expectedRevision,
      artifactIds: [],
      errorCode: code,
    })
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const current = this.currentActor(actor)
      requireCondition(current.member.projectId === command.scope.projectId, 'FORBIDDEN')
      const fingerprint = commandFingerprint(command, current.member.id)
      const previous = this.db
        .prepare('SELECT fingerprint,receipt FROM commands WHERE project_id=? AND id=?')
        .get(command.scope.projectId, command.commandId)
      if (previous !== undefined) {
        requireCondition(previous.fingerprint === fingerprint, 'IDEMPOTENCY_CONFLICT')
        this.db.exec('COMMIT')
        return { ...readReceipt(String(previous.receipt)), status: 'replayed' }
      }
      const snapshot = this.snapshot(current)
      const project = snapshot.project
      this.validateCommandTargets(command, current)
      requireCondition(project.revision === command.expectedRevision, 'STALE_REVISION')
      if ('ownerId' in command.payload) {
        const ownerId = command.payload.ownerId
        requireCondition(
          snapshot.members.some(
            m => m.id === ownerId && m.roles.includes(command.payload.type === 'task.create' ? 'developer' : 'product'),
          ),
          'OWNER_ROLE_REQUIRED',
        )
      }
      const beforeState = auditState(project)
      const before = project.artifacts.length
      let entityId: EntityId
      if (command.payload.type === 'member.create') {
        requireRole(current, 'admin')
        const c = command.payload
        entityId = this.createMember(project.id, c.username, c.name, c.password, c.roles).id
      } else entityId = applyCommand(project, command.payload, command.scope, current)
      project.revision++
      project.activities.push({
        id: newId(),
        at: new Date().toISOString(),
        actorId: current.member.id,
        command: command.payload.type,
        entityId,
        summary: command.payload.type,
        beforeState,
        afterState: auditState(project),
        revision: project.revision,
      })
      const receipt: CommandReceipt = {
        commandId: command.commandId,
        status: 'applied',
        entityId,
        revision: project.revision,
        artifactIds: project.artifacts.slice(before).map(a => a.id),
      }
      this.db.prepare('UPDATE projects SET data=? WHERE id=?').run(JSON.stringify(project), project.id)
      this.db
        .prepare('INSERT INTO commands VALUES (?,?,?,?)')
        .run(project.id, command.commandId, fingerprint, JSON.stringify(receipt))
      this.db.exec('COMMIT')
      return receipt
    } catch (error) {
      this.db.exec('ROLLBACK')
      if (error instanceof WorkflowError) return rejection(error.code)
      throw error
    }
  }
  /** Validate all referenced command targets before cancelling scoped execution. */
  validateCommandTargets(command: CommandEnvelope<WorkflowCommand>, actor: AuthActor): ProjectState {
    const project = this.validateScope(command.scope, actor)
    const payload = command.payload
    if ('versionId' in payload && payload.versionId && command.scope.versionId)
      requireCondition(payload.versionId === command.scope.versionId, 'SCOPE_MISMATCH')
    if ('requirementId' in payload && command.scope.requirementId)
      requireCondition(payload.requirementId === command.scope.requirementId, 'SCOPE_MISMATCH')
    const task = 'taskId' in payload ? project.tasks.find(t => t.id === payload.taskId) : undefined
    const submission =
      'submissionId' in payload ? project.submissions.find(s => s.id === payload.submissionId) : undefined
    const defect = 'defectId' in payload ? project.defects.find(d => d.id === payload.defectId) : undefined
    const change = 'changeId' in payload ? project.changes.find(c => c.id === payload.changeId) : undefined
    for (const target of [task, submission, defect, change])
      if (target && command.scope.versionId)
        requireCondition(target.versionId === command.scope.versionId, 'SCOPE_MISMATCH')
    if (submission && command.scope.submissionId)
      requireCondition(submission.id === command.scope.submissionId, 'SCOPE_MISMATCH')
    return project
  }
  /**
   * @param scope - requested context. @param actor - authenticated member. @returns authorized project after
   * checking every scope reference.
   */
  validateScope(scope: WorkflowScope, actor: AuthActor): ProjectState {
    const p = this.snapshot(actor).project
    requireCondition(scope.projectId === p.id, 'FORBIDDEN')
    if (scope.versionId)
      requireCondition(
        p.versions.some(v => v.id === scope.versionId),
        'NOT_FOUND',
      )
    if (scope.requirementId) {
      const r = p.requirements.find(r => r.id === scope.requirementId)
      requireCondition(r && (!scope.versionId || r.versionId === scope.versionId), 'SCOPE_MISMATCH')
    }
    if (scope.submissionId)
      requireCondition(
        p.submissions.some(s => s.id === scope.submissionId && s.versionId === scope.versionId),
        'SCOPE_MISMATCH',
      )
    if (scope.nodeId && scope.stageId)
      requireCondition(
        workflowTemplate.find(s => s.id === scope.stageId)?.nodes.some(n => n.id === scope.nodeId),
        'SCOPE_MISMATCH',
      )
    return p
  }
  /** @param workspace - filesystem-verified facts supplied by the runtime. @param actor - member registering the checkout. */
  saveWorkspace(workspace: Workspace, actor: AuthActor): void {
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const current = this.currentActor(actor)
      requireRole(current, 'developer')
      const p = this.snapshot(current).project
      const existing = p.workspaces.findIndex(w => w.id === workspace.id)
      if (existing < 0) p.workspaces.push(workspace)
      else p.workspaces[existing] = workspace
      p.revision++
      p.activities.push({
        id: newId(),
        at: new Date().toISOString(),
        actorId: current.member.id,
        command: 'workspace.register',
        entityId: workspace.id,
        summary: workspace.name,
        revision: p.revision,
      })
      this.db.prepare('UPDATE projects SET data=? WHERE id=?').run(JSON.stringify(p), p.id)
      this.db.exec('COMMIT')
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }
  /**
   * @param key - canonical scope including its frozen baseline. @param actor - authenticated member. @returns
   * owned session ID, if already created.
   */
  sessionBinding(key: string, actor: AuthActor): string | undefined {
    const current = this.currentActor(actor)
    const row = this.db
      .prepare('SELECT session_id FROM session_bindings WHERE member_id=? AND scope=?')
      .get(current.member.id, key)
    return row === undefined ? undefined : String(row.session_id)
  }
  /** @param key - canonical scope. @param sessionId - newly created Harness session. @param actor - owning member. */
  bindSession(key: string, sessionId: string, actor: AuthActor): void {
    const current = this.currentActor(actor)
    this.db.prepare('INSERT INTO session_bindings VALUES (?,?,?,?)').run(newId(), current.member.id, key, sessionId)
  }
  /** Re-resolve roles at each operation; callers cannot forge a permission list. */
  private currentActor(actor: AuthActor): AuthActor {
    const row = this.db.prepare('SELECT data FROM members WHERE id=?').get(actor.member.id)
    requireCondition(row, 'FORBIDDEN')
    const member = readMember(String(row.data))
    requireCondition(member.projectId === actor.member.projectId, 'FORBIDDEN')
    return { member }
  }
  /** Persist salted password material separately from the public member record. */
  private createMember(
    projectId: EntityId,
    username: string,
    name: string,
    password: string,
    roles: Member['roles'],
  ): Member {
    requireCondition(
      /^[a-zA-Z0-9._-]{3,60}$/.test(username) &&
        password.length >= 12 &&
        password.length <= 200 &&
        name.trim().length > 0,
      'INVALID_MEMBER',
    )
    requireCondition(
      this.db.prepare('SELECT id FROM members WHERE username=?').get(username) === undefined,
      'USERNAME_EXISTS',
    )
    const member: Member = { id: newId(), projectId, name, username, roles }
    const salt = randomBytes(16).toString('hex')
    this.db
      .prepare('INSERT INTO members VALUES (?,?,?,?,?,?)')
      .run(member.id, projectId, username, salt, scryptSync(password, salt, 64).toString('hex'), JSON.stringify(member))
    return member
  }
}
