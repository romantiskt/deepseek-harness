import { afterEach, beforeEach, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
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
it('authenticates server-side identity and never exposes password hashes', () => {
  expect(() => repo.login('admin', 'incorrect')).toThrow('INVALID_LOGIN')
  const login = repo.login('admin', 'test-password-123')
  expect(repo.authenticate(login.token).member.id).toBe(actor.member.id)
  expect(JSON.stringify(repo.snapshot(actor))).not.toMatch(/password|scrypt|test-password/)
  repo.logout(login.token)
  expect(() => repo.authenticate(login.token)).toThrow('UNAUTHENTICATED')
})
