// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-test-runtime'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import { createWorkbenchStore } from '../src/client/workbench-store.ts'
import { Workbench, type WorkbenchProps } from '../src/client/workbench.tsx'
import { zh } from '../src/client/locales.ts'
import type { ModelView } from '../src/client/model.ts'
import type { ChatView } from '../src/client/chat-model.ts'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

/** Mount the actual signed-out page with an observable authentication result. */
function renderLogin(status: 'login' | 'setup' = 'login') {
  const view = createWorkbenchStore().create()
  const model = createSnapshotStore<ModelView>({ status, snapshot: null, error: '', busy: false })
  const chat = createSnapshotStore<ChatView>({
    sessionId: '', status: 'idle', error: '', loading: false, context: '',
  })
  const props: Partial<WorkbenchProps> = {
    t: key => zh[key as keyof typeof zh] ?? key,
    actions: view.actions,
    useStore: bindSnapshotSelector(view),
    useModel: bindSnapshotSelector(model),
    useChat: bindSnapshotSelector(chat),
    selectContext: vi.fn(),
    signIn: vi.fn(),
  }
  render(<Workbench {...(props as WorkbenchProps)} />)
  return model
}

it('explains existing-account login without showing administrator setup instructions', () => {
  renderLogin()
  expect(screen.getByText('使用此研发空间已有的本地账号登录；需要账号时请联系项目管理员')).toBeTruthy()
  expect(screen.queryByText(zh.setupHint)).toBeNull()
  expect(screen.getByLabelText('密码')).toHaveProperty('autocomplete', 'current-password')
  expect(screen.queryByLabelText(zh.projectName)).toBeNull()
})

it.each(['INVALID_LOGIN', 'INVALID_LOGIN (gateway/internal)'])(
  'explains %s while preserving the fields for retry', (error) => {
    const model = renderLogin()
    const username = screen.getByLabelText(zh.username)
    const password = screen.getByLabelText(/密码/)
    fireEvent.change(username, { target: { value: 'local-member' } })
    fireEvent.change(password, { target: { value: 'private-test-password' } })
    act(() => { model.set({ ...model.getSnapshot(), error }) })
    expect(screen.getByRole('alert').textContent).toBe('账号或密码不正确，请核对本地账号后重试')
    expect(username).toHaveProperty('value', 'local-member')
    expect(password).toHaveProperty('value', 'private-test-password')
    expect(screen.getByRole('button', { name: zh.enter })).toHaveProperty('disabled', false)
  },
)

it('asks an expired member session to sign in again', () => {
  const model = renderLogin()
  act(() => { model.set({ ...model.getSnapshot(), error: 'UNAUTHENTICATED (gateway/internal)' }) })
  expect(screen.getByRole('alert').textContent).toBe('登录已失效，请重新登录')
})

it('retains the administrator fields and password rule on first-time setup', () => {
  renderLogin('setup')
  expect(screen.getByText(zh.setupHint)).toBeTruthy()
  expect(screen.getByLabelText(zh.projectName)).toHaveProperty('required', true)
  expect(screen.getByLabelText(zh.password)).toHaveProperty('minLength', 12)
  expect(screen.getByLabelText(zh.password)).toHaveProperty('autocomplete', 'new-password')
})
