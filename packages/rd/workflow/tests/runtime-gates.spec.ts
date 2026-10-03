import { randomUUID } from 'node:crypto'
import { Context } from '@deepseek-ai/cordis'
import { expect, it, vi } from 'vitest'
import { RdWorkflow } from '../src/index.ts'
it('waits for execution quiescence and replays without repeating side effects', async () => {
  const ctx = new Context()
  const fiber = await ctx.plugin(RdWorkflow, { databasePath: ':memory:' })
  const service = ctx.rdWorkflow
  try {
    const login = service.bootstrap('admin', 'Owner', 'local-test-12345', 'Test')
    const state = () => service.snapshot(login.token).project
    const send = (payload: object) =>
      service.execute(
        login.token,
        JSON.stringify({
          commandId: randomUUID(),
          scope: { projectId: state().id },
          expectedRevision: state().revision,
          payload,
        }),
      )
    const requirementId = (
      await send({
        type: 'requirement.create',
        title: 'Feature',
        content: 'Initial',
        acceptance: 'Checks',
        priority: 'P1',
        ownerId: login.member.id,
      })
    ).entityId
    const versionId = (await send({ type: 'version.create', title: '1.0', targetDate: '', ownerId: login.member.id }))
      .entityId
    await send({ type: 'version.assign', versionId, requirementId, included: true })
    let release: () => void = () => {}
    const stop = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve
        }),
    )
    const dispose = service.beforeScopeChange(stop)
    const command = {
      commandId: randomUUID(),
      scope: { projectId: state().id, versionId },
      expectedRevision: state().revision,
      payload: {
        type: 'change.propose',
        versionId,
        requirementId,
        title: 'Changed',
        content: 'Updated',
        acceptance: 'New checks',
        impact: 'Code',
        affectedNodes: ['07'],
      },
    }
    const pending = service.execute(login.token, JSON.stringify(command))
    await Promise.resolve()
    expect(() => {
      service.assertWritable(versionId)
    }).toThrow('SCOPE_PAUSED')
    expect(state().changes).toHaveLength(0)
    release()
    expect((await pending).status).toBe('applied')
    expect(() => {
      service.assertWritable(versionId)
    }).not.toThrow()
    expect((await service.execute(login.token, JSON.stringify(command))).status).toBe('replayed')
    expect(stop).toHaveBeenCalledTimes(1)
    dispose()
  } finally {
    await fiber.dispose()
  }
})
