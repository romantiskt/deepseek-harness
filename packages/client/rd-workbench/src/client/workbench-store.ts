/** Remount-safe selection and composer drafts, never business records. */
import { defineStore } from '@deepseek-ai/dsh-client-store'
/** Create one workbench viewing store at plugin registration. @returns viewing state handle. */
export function createWorkbenchStore() {
  return defineStore({
    persist: 'ai-rd.view.v1',
    init: () => ({
      versionId: '',
      requirementId: '',
      stage: 0,
      nodeId: '01',
      taskId: '',
      tab: 'nodes',
      focus: false,
      width: 60,
      drafts: {} as Record<string, string>,
    }),
    actions: {
      /** Select a version without advancing its lifecycle. */
      version: (draft, id: string) => {
        draft.versionId = id
        draft.requirementId = ''
        draft.taskId = ''
      },
      /** Select one requirement context. */
      requirement: (draft, id: string) => {
        draft.requirementId = id
      },
      /** Browse a stage without modifying persisted outcomes. */
      stage: (draft, index: number, nodeId: string) => {
        draft.stage = index
        draft.nodeId = nodeId
      },
      /** Select the active workflow node. */
      node: (draft, id: string) => {
        draft.nodeId = id
      },
      /** Choose one explicit task for code authority. */
      task: (draft, id: string) => {
        draft.taskId = id
      },
      /** Select a detail panel. */
      tab: (draft, tab: string) => {
        draft.tab = tab
      },
      /** Preserve every context's unsent composer text. */
      compose: (draft, scope: string, text: string) => {
        draft.drafts[scope] = text
      },
      /** Expand the conversation without losing its draft. */
      focus: (draft) => {
        draft.focus = !draft.focus
      },
      /** Keep a usable width for both columns. */
      width: (draft, width: number) => {
        draft.width = Math.max(45, Math.min(75, width))
      },
    },
  })
}
