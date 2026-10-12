/** Additive R&D panels over the standard Harness browser shell. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { SessionReference } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { ConversationHost, NativeConversation } from './conversation.tsx'
import runtimeRemote from '@deepseek-ai/dsh-rd-runtime/remote'
import { ChatModel } from './chat-model.ts'
import workflowRemote from '@deepseek-ai/dsh-rd-workflow/remote'
import { WorkbenchModel } from './model.ts'
import { createWorkbenchStore } from './workbench-store.ts'
import { Workbench, WorkbenchIcon, type WorkbenchFace } from './workbench.tsx'
import { en, zh } from './locales.ts'

/** Runtime dependencies are injected by Cordis rather than imported feature implementations. */
export const inject = ['slots', 'locale', 'remote', 'layout', 'sessions']
/** @param ctx - client plugin lifetime. @returns after Remote mounting and panel registration. */
export async function apply(ctx: Context): Promise<void> {
  const unmount = await ctx.remote.$mount(workflowRemote)
  ctx.effect(() => unmount, 'rd: remote assembly')
  const unmountRuntime = await ctx.remote.$mount(runtimeRemote)
  ctx.effect(() => unmountRuntime, 'rd: runtime assembly')
  ctx.inject(['remote.rdWorkflow', 'remote.rdRuntime'], async (ctx) => {
    ctx.effect(() => ctx.locale.register('rd', { zh, en }), 'rd: locale')
    /** Unwrap transport errors while keeping business rejections in their receipt. */
    const unwrap = <T>(result: { ok: true; value: T } | { ok: false; error: { code: string; message: string } }): T => {
      if (!result.ok) throw new Error(`${result.error.message} (${result.error.code})`)
      return result.value
    }
    const model = new WorkbenchModel({
      needsSetup: async () => unwrap(await ctx.remote.rdWorkflow.needsSetup()),
      bootstrap: async (username, name, password, project) =>
        unwrap(await ctx.remote.rdWorkflow.bootstrap(username, name, password, project)),
      login: async (username, password) => unwrap(await ctx.remote.rdWorkflow.login(username, password)),
      logout: async (token) => {
        unwrap(await ctx.remote.rdWorkflow.logout(token))
      },
      snapshot: async token => unwrap(await ctx.remote.rdWorkflow.snapshot(token)),
      execute: async (token, command) => unwrap(await ctx.remote.rdWorkflow.execute(token, command)),
    })
    const reference = createSnapshotStore<SessionReference | undefined>(undefined)
    const chat = new ChatModel(
      {
        chat: async (scope, task) => unwrap(await ctx.remote.rdRuntime.conversation(model.credential(), scope, task)),
        prompt: async (scope, text, task) =>
          unwrap(await ctx.remote.rdRuntime.prompt(model.credential(), scope, text, task)),
        stop: async (scope, task) => {
          unwrap(await ctx.remote.rdRuntime.stop(model.credential(), scope, task))
        },
        watch: (id, update, failed) => {
          const retained = ctx.sessions.retain(id as SessionId, { source: 'rdWorkbench' })
          reference.set(retained)
          let active = true
          const publish = () => { if (active) update(retained.binding.session.getSnapshot().running) }
          const unsubscribe = retained.binding.session.subscribe(publish)
          void retained.ready.then(publish, (error: unknown) => { if (active) failed(String(error)) })
          return () => {
            active = false
            unsubscribe()
            reference.set(undefined)
            retained.release()
          }
        },
      },
      () => model.load(),
    )
    ctx.effect(() => ctx.slots.registerFactory({
      name: 'rd.conversation', scope: 'root',
      children: { 'rd.conversation.session': { kind: 'single', scope: 'session' } },
      inject: () => ({ hooks: { reference } }),
    }, ConversationHost), 'rd: native conversation')
    ctx.slots.inject('rd.conversation.session', () =>
      ctx.slots.register({ name: 'rd.conversation.session' }, NativeConversation))
    ctx.effect(
      () => () => {
        model.dispose()
        chat.dispose()
      },
      'rd: models',
    )
    ctx.on('connection/reset', () => {
      void model.load()
      chat.reconnect()
    })
    const handle = createWorkbenchStore(),
      instance = handle.create()
    const store: typeof handle = { ...handle, create: () => instance }
    const t = ctx.locale.bind('rd')
    const views = ['work', 'requirements', 'versions', 'workspaces', 'testing'] as const
    for (const [index, view] of views.entries()) {
      const panelId = `rd-${view}` as MainPanelId
      ctx.slots.inject('main', () => {
        const dispose = ctx.slots.register(
          {
            name: 'main',
            key: panelId,
            locale: 'rd',
            store,
            inject: (): WorkbenchFace => ({
              view,
              hooks: { model: model.state, chat: chat.state },
              selectContext: (scope, task, baseline) => {
                chat.select(scope, task, baseline)
              },
              openDocumentFolder: scope => model.perform(async () => {
                unwrap(await ctx.remote.rdRuntime.openDocumentFolder(model.credential(), JSON.stringify(scope)))
              }),
              send: text => chat.send(text),
              stop: () => chat.stop(),
              registerWorkspace: (path, branch) =>
                model.perform(async () => {
                  unwrap(await ctx.remote.rdRuntime.registerWorkspace(model.credential(), path, branch))
                  await model.load()
                }),
              diff: async workspaceId => unwrap(await ctx.remote.rdRuntime.diff(model.credential(), workspaceId)),
              check: (taskId, script) =>
                model.perform(async () => {
                  unwrap(await ctx.remote.rdRuntime.check(model.credential(), taskId, script))
                  await model.load()
                }),
              signIn: values => model.signIn(values),
              signOut: async () => {
                chat.dispose()
                await model.signOut()
              },
              refresh: () => model.load(),
              execute: (payload, scope, revision) => model.execute(payload, scope, revision),
              openHarness: () => {
                ctx.layout.selectPanel(null)
              },
            }),
          },
          Workbench,
        )
        if (view === 'versions') ctx.layout.selectPanel(panelId)
        return dispose
      })
      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register(
          { name: 'sidebar.panellist', id: panelId, order: -100 + index, label: () => t(view), locale: 'rd' },
          WorkbenchIcon,
        ),
      )
    }
    await model.load()
  })
}
