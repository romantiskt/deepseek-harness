/** Additive R&D panels over the standard Harness browser shell. */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
import runtimeRemote from '@deepseek-ai/dsh-rd-runtime/remote'
import { ChatModel } from './chat-model.ts'
import workflowRemote from '@deepseek-ai/dsh-rd-workflow/remote'
import { WorkbenchModel } from './model.ts'
import { createWorkbenchStore } from './workbench-store.ts'
import { Workbench, WorkbenchIcon, type WorkbenchFace } from './workbench.tsx'
import { en, zh } from './locales.ts'

/** Runtime dependencies are injected by Cordis rather than imported feature implementations. */
export const inject = ['slots', 'locale', 'remote', 'layout']
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
    const chat = new ChatModel(
      {
        chat: async (scope, task) => unwrap(await ctx.remote.rdRuntime.chat(model.credential(), scope, task)),
        prompt: async (scope, text, task) =>
          unwrap(await ctx.remote.rdRuntime.prompt(model.credential(), scope, text, task)),
        stop: async (scope, task) => {
          unwrap(await ctx.remote.rdRuntime.stop(model.credential(), scope, task))
        },
      },
      () => model.load(),
      1000,
    )
    ctx.effect(
      () => () => {
        model.dispose()
        chat.dispose()
      },
      'rd: models',
    )
    ctx.on('connection/reset', () => {
      void model.load()
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
              selectContext: (scope, task) => {
                chat.select(scope, task)
              },
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
