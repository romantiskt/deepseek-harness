// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { ChatModel } from '../src/client/chat-model.ts'
import type { EntityId } from '../../../rd/contracts/src/types.ts'
import type { ChatSnapshot } from '../../../rd/runtime/src/types.ts'
afterEach(() => vi.useRealTimers())
it('rejects a late transcript after changing requirement context and keeps errors visible', async () => {
  vi.useFakeTimers()
  let resolveOld: (value: ChatSnapshot) => void = () => {}
  const api = {
    chat: vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<ChatSnapshot>((resolve) => {
            resolveOld = resolve
          }),
      )
      .mockResolvedValue({
        sessionId: 'new',
        status: 'idle',
        messages: [{ id: 'new', role: 'assistant', text: 'New context' }],
        error: '',
      }),
    prompt: vi.fn().mockRejectedValue(new Error('MODEL_NOT_CONFIGURED')),
    stop: vi.fn(),
  }
  const model = new ChatModel(api, async () => {}, 1000)
  model.select({ projectId: 'p' as EntityId, requirementId: 'old' as EntityId }, '')
  model.select({ projectId: 'p' as EntityId, requirementId: 'new' as EntityId }, '')
  await Promise.resolve()
  await Promise.resolve()
  resolveOld({
    sessionId: 'old',
    status: 'idle',
    messages: [{ id: 'old', role: 'assistant', text: 'Old context' }],
    error: '',
  })
  await Promise.resolve()
  expect(model.state.getSnapshot().sessionId).toBe('new')
  expect(await model.send('Hi')).toBe(false)
  expect(model.state.getSnapshot().error).toContain('MODEL_NOT_CONFIGURED')
  model.dispose()
  expect(vi.getTimerCount()).toBe(0)
})
