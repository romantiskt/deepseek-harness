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
    refreshSessions: vi.fn(async () => {}),
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
    refreshSessions: vi.fn(async () => {}),
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

it('waits for the Host catalog before retaining a restored session', async () => {
  let ready: () => void = () => {}
  const catalog = new Promise<void>((resolve) => { ready = resolve })
  const api = {
    chat: vi.fn().mockResolvedValue({ sessionId: 'restored', status: 'idle', error: '' }),
    prompt: vi.fn(), stop: vi.fn(),
    refreshSessions: vi.fn(() => catalog),
    watch: vi.fn(() => () => {}),
  }
  const model = new ChatModel(api, async () => {})
  try {
    model.select({ projectId: 'p' as EntityId }, '', 0)
    await vi.waitFor(() => { expect(api.refreshSessions).toHaveBeenCalledOnce() })
    expect(api.watch).not.toHaveBeenCalled()
    ready()
    await vi.waitFor(() => { expect(api.watch).toHaveBeenCalledWith('restored', expect.any(Function), expect.any(Function)) })
  } finally {
    ready()
    model.dispose()
  }
})

it('does not resubmit admitted input when the native catalog refresh fails', async () => {
  const api = {
    chat: vi.fn().mockResolvedValue({ sessionId: '', status: 'idle', error: '' }),
    prompt: vi.fn().mockResolvedValue('created'), stop: vi.fn(),
    refreshSessions: vi.fn().mockRejectedValue(new Error('CATALOG_UNAVAILABLE')),
    watch: vi.fn(() => () => {}),
  }
  const model = new ChatModel(api, async () => {})
  try {
    model.select({ projectId: 'p' as EntityId }, '', 0)
    await vi.waitFor(() => { expect(model.state.getSnapshot().loading).toBe(false) })
    expect(await model.send('Accepted once')).toBe(true)
    expect(api.prompt).toHaveBeenCalledOnce()
    expect(api.watch).not.toHaveBeenCalled()
    expect(model.state.getSnapshot().error).toContain('CATALOG_UNAVAILABLE')
  } finally {
    model.dispose()
  }
})
