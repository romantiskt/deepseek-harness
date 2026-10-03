import { Context } from '@deepseek-ai/cordis'
import { expect, it, vi } from 'vitest'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { RdRuntime } from '../src/index.ts'
import { fixture } from '../../workflow/tests/helpers.ts'
import { inspectWorkspace } from '../src/workspaces.ts'

it('resumes the owned conversation with new file tools when its task changes workspace', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'rd-switch-'))
  const f = fixture()
  const ctx = new Context()
  let cleanup = async (): Promise<void> => {}
  try {
    const workspace = async (name: string) => {
      const path = join(dir, name)
      execFileSync('git', ['init', '-b', 'main', path])
      writeFileSync(join(path, 'index.js'), `export const location = '${name}'\n`)
      execFileSync('git', ['-C', path, 'add', '.'])
      execFileSync('git', [
        '-C',
        path,
        '-c',
        'user.name=Test',
        '-c',
        'user.email=test@localhost',
        'commit',
        '-m',
        'fixture',
      ])
      const result = await inspectWorkspace(path, 'main')
      f.repo.saveWorkspace(result, f.actor)
      return result
    }
    const a = await workspace('a'),
      b = await workspace('b')
    const requirementId = f.requirement(),
      versionId = f.version()
    f.send({ type: 'version.assign', versionId, requirementId, included: true })
    f.send({ type: 'requirement.review', requirementId, outcome: 'passed', note: 'Approved' })
    f.approve(versionId)
    f.send({ type: 'version.freeze', versionId })
    const taskId = f.send({
      type: 'task.create',
      versionId,
      title: 'Edit selected checkout',
      ownerId: f.actor.member.id,
    }).entityId
    f.send({ type: 'task.bindWorkspace', taskId, workspaceId: a.id })
    let sessionId: string | undefined
    const dispose = vi.fn(async () => {})
    const followup = vi.fn()
    const makeHandle = (id: string) => ({
      agent: { id, status: 'idle', followup, whenIdle: async () => {}, cancel: () => {} },
      dispose,
    })
    const create = vi.fn(async (options: { sessionId: string }) => makeHandle(options.sessionId))
    const resume = vi.fn(async (options: { resumeSessionId: string }) => makeHandle(options.resumeSessionId))
    // These doubles supply only the upstream service members exercised by prompt lifecycle.
    ctx.provide('rdWorkflow', {
      snapshot: () => f.repo.snapshot(f.actor),
      context: () => f.state(),
      sessionBinding: () => sessionId,
      bindSession: (_token: string, _key: string, id: string) => {
        sessionId = id
      },
      beforeSubmission: () => () => {},
      beforeScopeChange: () => () => {},
      assertWritable: () => {},
    } as Context['rdWorkflow'])
    ctx.provide('agents', { create, resume } as Context['agents'])
    ctx.provide('agentDefaultModel', { currentSelection: () => ({}) } as Context['agentDefaultModel'])
    ctx.provide('tools', {} as Context['tools'])
    ctx.provide('sessionQuery', {} as Context['sessionQuery'])
    ctx.provide('subprocess', {} as Context['subprocess'])
    const fiber = await ctx.plugin(RdRuntime, {
      scratchPath: join(dir, 'scratch'),
      maxFileBytes: 10000,
      maxContextChars: 64000,
      maxMessages: 20,
      maxOutputBytes: 10000,
      checkTimeoutMs: 1000,
      processGraceMs: 100,
    })
    cleanup = () => fiber.dispose()
    const scope = JSON.stringify({ projectId: f.state().id, versionId })
    const first = await ctx.rdRuntime.prompt('test', scope, 'Read selected source', taskId)
    await Promise.resolve()
    f.send({ type: 'task.bindWorkspace', taskId, workspaceId: b.id })
    await expect(ctx.rdRuntime.prompt('test', scope, 'Read the newly selected source', taskId)).resolves.toBe(first)
    expect(resume).toHaveBeenCalledTimes(1)
    expect(dispose).toHaveBeenCalledTimes(1)
    expect(followup).toHaveBeenCalledTimes(2)
  } finally {
    await cleanup()
    f.repo.close()
    rmSync(dir, { recursive: true, force: true })
  }
})
