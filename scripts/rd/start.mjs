/** Start the additive local R&D profile through the supported Harness launcher. */
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

/** Project-local paths keep workflow data independent from the user's default Harness. */
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const profileHome = process.env.DSH_HOME ?? join(root, '.local/harness-home')
const cli = join(root, 'apps/cli/lib/bin.js')
const environment = {
  ...process.env,
  DSH_HOME: profileHome,
  PATH: `${join(root, 'node_modules/.bin')}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH ?? ''}`,
}
if (!existsSync(cli) || !existsSync(join(root, 'apps/web/dist/index.html'))) {
  throw new Error('Build the R&D workbench first: pnpm run build:rd')
}
mkdirSync(profileHome, { recursive: true, mode: 0o700 })
/** Run setup commands and preserve their nonzero exit status. */
function run(args) {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd: root, env: environment, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
if (!existsSync(join(profileHome, 'profiles/ai-rd/package.json'))) {
  run(['--profile', 'ai-rd', '--from-default-profile', 'web', '--dump-config'])
}
const profile = JSON.parse(readFileSync(join(profileHome, 'profiles/ai-rd/package.json'), 'utf8'))
if (!profile.dsh?.profile?.bundles?.includes('@deepseek-ai/dsh-rd-workbench')) {
  run(['plugin', '--profile', 'ai-rd', 'link', join(root, 'packages/bundle/rd-workbench')])
}
run([
  '--profile',
  'ai-rd',
  '--patch',
  join(root, 'apps/web/tests/pin-browse-picker.overlay.yml'),
  ...process.argv.slice(2),
  '--host',
  '127.0.0.1',
  '--port',
  process.env.AI_RD_PORT ?? '3091',
  '--no-open',
])
