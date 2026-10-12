// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-test-runtime'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import { createWorkbenchStore } from '../src/client/workbench-store.ts'
import { Workbench, type WorkbenchProps } from '../src/client/workbench.tsx'
import { zh } from '../src/client/locales.ts'
import { filterArtifacts } from '../src/client/presentation.ts'
import { workflowTemplate } from '../../../rd/workflow/src/workflow-template.ts'
import type { WorkbenchSnapshot, EntityId } from '../../../rd/contracts/src/types.ts'
import type { ModelView } from '../src/client/model.ts'
import type { ChatView } from '../src/client/chat-model.ts'
afterEach(() => {
  cleanup()
  localStorage.clear()
})
it('selectingHistoryDoesNotAdvanceWorkflow and focusModePreservesDraft through visible controls', () => {
  const id = (value: string) => value as EntityId
  const actor = {
    id: id('owner'),
    projectId: id('project'),
    name: 'Product',
    username: 'product',
    roles: ['product' as const],
  }
  const snapshot: WorkbenchSnapshot = {
    documentDirectory: '/example/artifacts/project',
    actor,
    members: [actor],
    stages: workflowTemplate,
    project: {
      id: id('project'),
      name: 'Local project',
      revision: 1,
      requirements: [],
      versions: [
        {
          id: id('version'),
          title: '1.0',
          targetDate: '',
          ownerId: actor.id,
          requirementIds: [],
          status: 'planning',
          baselines: [],
          nodes: {},
          currentSubmissionId: null,
          releaseEvidence: '',
        },
      ],
      tasks: [],
      submissions: [],
      defects: [],
      changes: [],
      artifacts: [],
      activities: [],
      workspaces: [],
    },
  }
  const view = createWorkbenchStore().create()
  const model = createSnapshotStore<ModelView>({ status: 'ready', snapshot, error: '', busy: false })
  const chat = createSnapshotStore<ChatView>({
    sessionId: '',
    status: 'idle',
    error: '',
    loading: false,
    context: '',
  })
  const execute = vi.fn()
  const openDocumentFolder = vi.fn()
  const renderFactorySlot = vi.fn(() => <div data-testid="native-conversation" />)
  const props: Partial<WorkbenchProps> = {
    view: 'versions',
    t: key => zh[key as keyof typeof zh] ?? key,
    actions: view.actions,
    useStore: bindSnapshotSelector(view),
    useModel: bindSnapshotSelector(model),
    useChat: bindSnapshotSelector(chat),
    execute,
    openDocumentFolder,
    renderFactorySlot,
    selectContext: vi.fn(),
    send: vi.fn(),
    stop: vi.fn(),
    refresh: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    openHarness: vi.fn(),
    registerWorkspace: vi.fn(),
    diff: vi.fn(),
    check: vi.fn(),
  }
  render(<Workbench {...(props as WorkbenchProps)} />)
  const input = screen.getByRole('textbox', { name: zh.aiTitle })
  fireEvent.change(input, { target: { value: 'Keep my unsent requirement' } })
  fireEvent.click(screen.getByRole('button', { name: zh.focus }))
  fireEvent.click(screen.getByRole('button', { name: zh.restore }))
  expect(screen.getByRole('textbox', { name: zh.aiTitle })).toHaveProperty('value', 'Keep my unsent requirement')
  fireEvent.click(screen.getByRole('button', { name: /6.*反馈与沉淀/ }))
  expect(execute).not.toHaveBeenCalled()
  expect(snapshot.project.versions[0]?.status).toBe('planning')
  expect(view.getSnapshot().stage).toBe(5)
  act(() => { chat.set({ ...chat.getSnapshot(), sessionId: 'native-session', status: 'running' }) })
  expect(screen.getByTestId('native-conversation')).toBeTruthy()
  expect(renderFactorySlot).toHaveBeenCalledWith('rd.conversation', {})
  fireEvent.click(screen.getByRole('button', { name: zh.artifacts }))
  fireEvent.click(screen.getByRole('button', { name: zh.documentFolder }))
  expect(openDocumentFolder).toHaveBeenCalledWith(expect.objectContaining({ versionId: 'version', stageId: 'feedback' }))
  expect(screen.getByText('/example/artifacts/project/versions/version')).toBeTruthy()
  model.set({ ...model.getSnapshot(), error: 'STALE_REVISION' })
  fireEvent.click(screen.getByRole('button', { name: zh.newVersion }))
  expect(within(screen.getByRole('dialog')).getByRole('alert').textContent).toContain('STALE_REVISION')
})
it('restores view selection and draft on a fresh store', () => {
  const first = createWorkbenchStore().create()
  first.actions.version('selected')
  first.actions.compose('scope', 'Saved draft')
  const restored = createWorkbenchStore().create()
  expect(restored.getSnapshot()).toMatchObject({ versionId: 'selected', drafts: { scope: 'Saved draft' } })
})
it('keepsOldCardBoundToOriginalScope', () => {
  expect(
    filterArtifacts(
      [{ scope: { projectId: 'p', versionId: 'old' } }, { scope: { projectId: 'p', versionId: 'current' } }],
      { projectId: 'p', versionId: 'current' },
    ),
  ).toHaveLength(1)
})
