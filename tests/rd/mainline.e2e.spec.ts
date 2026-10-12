/** Replay an actual requirement-draft session through the shipped local Web launcher. */
import { expect, it } from 'vitest'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import type { CommandReceipt, LoginResult, WorkbenchSnapshot } from '../../packages/rd/contracts/src/types.ts'
import type { ChatSnapshot, ConversationState } from '../../packages/rd/runtime/src/types.ts'

it('replays real AI drafting, saves its artifact and retains the transcript without a provider key', async () => {
  const root = resolve(import.meta.dirname, '../..')
  const home = await mkdtemp(join(tmpdir(), 'rd-replay-'))
  const fixture = join(root, 'packages/rd/runtime/tests/fixtures/requirement-draft/session.v4.jsonl')
  const patch = join(home, 'replay.yml')
  await writeFile(patch, `- id: llm-deepseek\n  disabled: true\n- id: llm-deepseek-account\n  disabled: true\n- id: session-title-llm\n  disabled: true\n- id: agent-default-model\n  config:\n    provider: rd-replay\n    model: recorded-draft\n- insert:\n    - id: rd-llm-replay\n      name: ${JSON.stringify(join(root, 'packages/test-support/llm-replay/lib/index.js'))}\n      config:\n        file: ${JSON.stringify(fixture)}\n        providers:\n          - id: rd-replay\n            models:\n              - id: recorded-draft\n`)
  let output = ''
  const child = spawn(process.execPath, ['scripts/rd/start.mjs', '--patch', patch], {
    cwd: root, env: { ...process.env, DSH_HOME: home, AI_RD_PORT: '0', DEEPSEEK_API_KEY: '' },
    stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32',
  })
  child.stdout?.on('data', chunk => { output += String(chunk) })
  child.stderr?.on('data', chunk => { output += String(chunk) })
  const exited = new Promise<void>(resolveExit => child.once('exit', () => { resolveExit() }))
  try {
    let bootstrap = ''
    const deadline = Date.now() + 45000
    while (!bootstrap && Date.now() < deadline) {
      bootstrap = output.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s\u001b]+/)?.[0] ?? ''
      if (child.exitCode !== null) throw new Error(`Replay host exited with ${child.exitCode}`)
      if (!bootstrap) await delay(100)
    }
    expect(bootstrap).not.toBe('')
    const origin = new URL(bootstrap).origin
    const boot = await fetch(bootstrap, { redirect: 'manual' })
    const cookie = boot.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
    /** Invoke the normal authenticated Harness Remote protocol. */
    const rpc = async <T>(method: string, args: object): Promise<T> => {
      const response = await fetch(`${origin}/api/${method}`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ type: 'client-request', rpcId: randomUUID(), method, payload: { args } }) })
      expect(response.status).toBe(200)
      const envelope = await response.json() as { result: { ok: boolean; value: T; error?: unknown } }
      if (!envelope.result.ok) throw new Error(JSON.stringify(envelope.result.error))
      return envelope.result.value
    }
    const login = await rpc<LoginResult>('rdWorkflow/bootstrap', { username: 'replay', name: 'Replay owner', password: 'keyless-fixture-password', projectName: 'Recorded draft acceptance' })
    const token = login.token
    const state = () => rpc<WorkbenchSnapshot>('rdWorkflow/snapshot', { token })
    const initial = (await state()).project
    const send = async (payload: object, versionId?: string) => {
      const current = (await state()).project
      return rpc<CommandReceipt>('rdWorkflow/execute', { token, json: JSON.stringify({ commandId: randomUUID(), expectedRevision: current.revision, scope: { projectId: initial.id, ...(versionId ? { versionId } : {}) }, payload }) })
    }
    const version = await send({ type: 'version.create', title: 'v0.1 · 主线验收', targetDate: '', ownerId: login.member.id })
    const scopeJson = JSON.stringify({ projectId: initial.id, versionId: version.entityId })
    const sessionId = await rpc<string>('rdRuntime/prompt', { token, scopeJson, taskId: '', text: '为 formatVersion(major, minor, patch) 生成结构化需求草稿，合法非负安全整数输出 v1.2.3，非法输入抛 TypeError。' })
    let chat: ChatSnapshot | undefined
    const settled = Date.now() + 45000
    while (Date.now() < settled) {
      chat = await rpc<ChatSnapshot>('rdRuntime/chat', { token, scopeJson, taskId: '' })
      if (chat.status !== 'running' && chat.messages.some(message => message.role === 'assistant' || message.role === 'system')) break
      await delay(100)
    }
    expect(chat?.status).toBe('idle')
    expect(chat?.error).toBe('')
    expect(chat?.messages.filter(message => message.role === 'assistant').length).toBeGreaterThan(0)
    const draft = (await state()).project.artifacts.find(a => a.kind === 'draft.requirement')
    expect(draft?.scope.versionId).toBe(version.entityId)
    const recorded = (await readFile(fixture, 'utf8')).trim().split('\n').map(line => JSON.parse(line) as { type: string; data?: { name?: string; arguments?: string } }).find(event => event.type === 'tool/call' && event.data?.name === 'rd_create_requirement_draft')
    const expected = JSON.parse(recorded?.data?.arguments ?? '{}') as { title: string; content: string; acceptance: string }
    const parsed = JSON.parse(draft?.text ?? '{}') as { title: string; content: string; acceptance: string }
    expect(parsed).toMatchObject(expected)
    const saved = await send({ type: 'requirement.saveDraft', artifactId: draft?.id, ...expected, priority: 'P1', ownerId: login.member.id, versionId: version.entityId }, version.entityId)
    expect(saved.status).toBe('applied')
    const final = (await state()).project
    expect(final.requirements).toHaveLength(1)
    expect(final.requirements[0]?.versionId).toBe(version.entityId)
    expect(final.versions[0]?.status).toBe('planning')
    expect(chat?.messages.find(message => message.role === 'user')?.text).not.toContain('projectId')
    const restored = await rpc<ChatSnapshot>('rdRuntime/chat', { token, scopeJson, taskId: '' })
    expect(restored.sessionId).toBe(sessionId)
    expect(restored.messages).toEqual(chat?.messages)
    const native = await rpc<ConversationState>('rdRuntime/conversation', { token, scopeJson, taskId: '' })
    expect(native).toEqual({ sessionId, status: 'idle', error: '' })
    const directory = (await state()).documentDirectory
    expect(await readFile(join(directory, 'artifacts', `${draft?.id}.md`), 'utf8')).toContain(expected.acceptance)
    for (const stage of ['requirements', 'design', 'development', 'testing', 'release', 'feedback'])
      expect(await readFile(join(directory, 'versions', version.entityId, `${stage}.md`), 'utf8')).toContain('本地文件夹')
  } finally {
    // The launcher waits synchronously for its CLI child, so signal the local process group.
    const signal = (name: NodeJS.Signals) => {
      if (child.exitCode !== null || child.signalCode !== null) return
      if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, name)
      else child.kill(name)
    }
    signal('SIGINT')
    const force = setTimeout(() => { signal('SIGKILL') }, 5000)
    await exited
    clearTimeout(force)
    await writeFile('/tmp/rd-replay-host.log', output.replace(/\?token=[^\s\u001b]+/g, '?token=[redacted]'), { mode: 0o600 })
    await rm(home, { recursive: true, force: true })
  }
}, 120000)
