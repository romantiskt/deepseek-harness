// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'
import { ChatModel } from '../src/client/chat-model.ts'
import type { EntityId } from '../../../rd/contracts/src/types.ts'

it('uses native status updates and releases the old session when the baseline changes', async () => {
  let publish: (running: boolean) => void = () => {}
  const release = vi.fn()
  const refresh = vi.fn(async () => {})
  const api = {
    chat: vi.fn().mockResolvedValue({ sessionId: 'native-session', status: 'idle', error: '' }),
    prompt: vi.fn().mockResolvedValue('native-session'),
    stop: vi.fn(),
    watch: vi.fn((_id: string, listener: (running: boolean) => void) => { publish = listener; return release }),
  }
  const model = new ChatModel(api, refresh)
  const scope = { projectId: 'p' as EntityId }
  model.select(scope, '', 1)
  await vi.waitFor(() => { expect(api.watch).toHaveBeenCalledOnce() })
  publish(true)
  expect(model.state.getSnapshot().status).toBe('running')
  publish(false)
  expect(refresh).toHaveBeenCalledOnce()
  model.select(scope, '', 2)
  expect(release).toHaveBeenCalledOnce()
  await vi.waitFor(() => { expect(api.chat).toHaveBeenCalledTimes(2) })
  model.reconnect()
  expect(model.state.getSnapshot()).toMatchObject({ sessionId: '', loading: true })
  await vi.waitFor(() => { expect(model.state.getSnapshot().loading).toBe(false) })
  model.dispose()
})

it('ignores late session resolution and stop failures from a previous context', async () => {
  let resolveOld: (value: { sessionId: string; status: 'idle'; error: string }) => void = () => {}
  let rejectStop: (reason: Error) => void = () => {}
  const api = {
    chat: vi.fn().mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve }))
      .mockResolvedValue({ sessionId: 'new', status: 'idle', error: '' }),
    prompt: vi.fn().mockRejectedValue(new Error('MODEL_NOT_CONFIGURED')),
    stop: vi.fn(() => new Promise<void>((_resolve, reject) => { rejectStop = reject })),
    watch: vi.fn(() => () => {}),
  }
  const model = new ChatModel(api, async () => {})
  model.select({ projectId: 'p' as EntityId, requirementId: 'old' as EntityId }, '', 0)
  const stopping = model.stop()
  model.select({ projectId: 'p' as EntityId, requirementId: 'new' as EntityId }, '', 0)
  await vi.waitFor(() => { expect(model.state.getSnapshot().sessionId).toBe('new') })
  resolveOld({ sessionId: 'old', status: 'idle', error: '' })
  rejectStop(new Error('OLD_STOP_ERROR'))
  await stopping
  expect(model.state.getSnapshot().error).toBe('')
  expect(await model.send('Hi')).toBe(false)
  expect(model.state.getSnapshot().error).toContain('MODEL_NOT_CONFIGURED')
  model.dispose()
})
