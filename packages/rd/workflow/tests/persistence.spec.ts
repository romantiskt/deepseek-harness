import { afterEach, beforeEach, expect, it } from 'vitest'
import { mkdtempSync, rmSync, readFileSync, existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { WorkflowRepository } from '../src/repository.ts'
import type { AuthActor, EntityId } from '../../contracts/src/types.ts'
let dir: string
let repo: WorkflowRepository
let actor: AuthActor
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'rd-test-'))
  repo = new WorkflowRepository(join(dir, 'rd.sqlite'))
  const login = repo.bootstrap('admin', 'Local administrator', 'test-password-123', 'Project')
  actor = repo.authenticate(login.token)
})
afterEach(() => {
  repo.close()
  rmSync(dir, { recursive: true, force: true })
})
const request = (projectId: EntityId) => ({
  commandId: 'cmd-1',
  scope: { projectId },
  expectedRevision: 0,
  payload: { type: 'version.create' as const, title: '1.0', targetDate: '', ownerId: actor.member.id },
})
it('replaysSameCommandOnce', () => {
  const cmd = request(actor.member.projectId)
  expect(repo.dispatch(cmd, actor).status).toBe('applied')
  expect(repo.dispatch(cmd, actor).status).toBe('replayed')
  expect(repo.snapshot(actor).project.versions).toHaveLength(1)
  expect(repo.snapshot(actor).project.activities).toHaveLength(1)
})
it('rejectsReusedKeyWithDifferentPayload', () => {
  const cmd = request(actor.member.projectId)
  repo.dispatch(cmd, actor)
  expect(repo.dispatch({ ...cmd, payload: { ...cmd.payload, title: '2.0' } }, actor).errorCode).toBe(
    'IDEMPOTENCY_CONFLICT',
  )
})
it('rejectsStaleRevision', () => {
  const cmd = request(actor.member.projectId)
  repo.dispatch(cmd, actor)
  expect(repo.dispatch({ ...cmd, commandId: 'cmd-2' }, actor).errorCode).toBe('STALE_REVISION')
  expect(repo.snapshot(actor).project.revision).toBe(1)
})
it('rejectsCrossProjectActor', () => {
  const cmd = request('another-project' as EntityId)
  expect(repo.dispatch(cmd, actor).errorCode).toBe('FORBIDDEN')
})
it('restoresAfterRestart', () => {
  const cmd = request(actor.member.projectId)
  repo.dispatch(cmd, actor)
  repo.close()
  repo = new WorkflowRepository(join(dir, 'rd.sqlite'))
  expect(repo.snapshot(actor).project.versions[0]?.title).toBe('1.0')
  expect(repo.dispatch(cmd, actor).status).toBe('replayed')
})
it('writes six stage documents and preserves earlier artifact revisions across restart', () => {
  const projectId = actor.member.projectId
  const version = repo.dispatch(request(projectId), actor).entityId
  const scope = { projectId, versionId: version, stageId: 'design' as const, nodeId: '05' }
  const command = {
    commandId: 'material-1', scope, expectedRevision: 1,
    payload: { type: 'artifact.createRevision' as const, title: 'Impact', text: '# Original analysis', kind: 'design' },
  }
  const first = repo.dispatch(command, actor)
  const directory = join(dir, 'artifacts', projectId)
  for (const stage of ['requirements', 'design', 'development', 'testing', 'release', 'feedback'])
    expect(existsSync(join(directory, 'versions', version, `${stage}.md`))).toBe(true)
  const original = join(directory, 'artifacts', `${first.entityId}.md`)
  const bytes = readFileSync(original, 'utf8')
  expect(bytes).toContain('# Original analysis')
  expect(bytes).toContain('file://')
  expect(bytes).toContain('open ')
  repo.dispatch({ ...command, commandId: 'material-2', expectedRevision: 2,
    payload: { ...command.payload, text: '# Updated analysis' } }, actor)
  expect(readFileSync(original, 'utf8')).toBe(bytes)
  expect(readFileSync(join(directory, 'versions', version, 'design.md'), 'utf8')).toContain(first.entityId)
  repo.close()
  repo = new WorkflowRepository(join(dir, 'rd.sqlite'))
  repo.snapshot(actor)
  expect(readFileSync(original, 'utf8')).toBe(bytes)
})
it('recovers a committed document after a failed file export without duplicating the command', () => {
  const projectId = actor.member.projectId
  repo.snapshot(actor)
  const blocked = join(dir, 'artifacts', projectId, 'artifacts')
  writeFileSync(blocked, 'blocked directory')
  const command = {
    commandId: 'retry-export', scope: { projectId }, expectedRevision: 0,
    payload: { type: 'artifact.createRevision' as const, title: 'Report', text: 'Saved once', kind: 'document' },
  }
  expect(() => repo.dispatch(command, actor)).toThrow()
  rmSync(blocked)
  const receipt = repo.dispatch(command, actor)
  expect(receipt.status).toBe('replayed')
  expect(repo.snapshot(actor).project.artifacts).toHaveLength(1)
  expect(readFileSync(join(blocked, `${receipt.entityId}.md`), 'utf8')).toContain('Saved once')
})
it('authenticates server-side identity and never exposes password hashes', () => {
  expect(() => repo.login('admin', 'incorrect')).toThrow('INVALID_LOGIN')
  const login = repo.login('admin', 'test-password-123')
  expect(repo.authenticate(login.token).member.id).toBe(actor.member.id)
  expect(JSON.stringify(repo.snapshot(actor))).not.toMatch(/password|scrypt|test-password/)
  repo.logout(login.token)
  expect(() => repo.authenticate(login.token)).toThrow('UNAUTHENTICATED')
})
