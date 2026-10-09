#!/bin/bash
# Finder entrypoint for the existing local R&D profile launcher.
set -euo pipefail
umask 077

# Finder does not inherit the interactive shell's Node installation paths.
export PATH="$HOME/.local/bin:$HOME/.hermes/node/bin:/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$project_dir"

# Keep a failed Finder launch visible without blocking noninteractive callers.
finish() {
  result=$?
  if [[ $result -ne 0 && $result -ne 130 && $result -ne 143 && -t 0 ]]; then
    printf '\n启动失败（退出码 %s）。按回车关闭窗口。\n' "$result"
    read -r _ || true
  fi
  exit "$result"
}
trap finish EXIT
trap 'exit 130' INT

# Report actionable setup errors without changing other running services.
fail() {
  printf '\n%s\n' "$1" >&2
  exit 1
}

command -v node >/dev/null || fail '未找到 Node.js。请安装 Node 22.19+（22.x）或 24+ 后重试。'
node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit((major === 22 && minor >= 19) || major >= 24 ? 0 : 1)' \
  || fail 'Node.js 版本不兼容。需要 Node 22.19+（22.x）或 24+。'

port="${AI_RD_PORT:-3091}"
[[ "$port" =~ ^[0-9]{1,5}$ ]] || fail 'AI_RD_PORT 必须是 1～65535 的端口号。'
port=$((10#$port))
((port >= 1 && port <= 65535)) || fail 'AI_RD_PORT 必须是 1～65535 的端口号。'
export AI_RD_PORT="$port"
export AI_RD_OPEN_BROWSER="${AI_RD_OPEN_BROWSER:-1}"
profile_home="${DSH_HOME:-$project_dir/.local/harness-home}"
launch_log="$profile_home/launcher-$port.log"

# A saved launch token plus an authenticated R&D RPC identifies this profile.
if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
  [[ "${AI_RD_REBUILD:-0}" != 1 ]] || fail '工作台正在运行。请先在原启动窗口按 Ctrl+C 停止，再重新构建。'
  if node --input-type=module - "$launch_log" "$port" <<'NODE'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

try {
  const origin = `http://127.0.0.1:${process.argv[3]}`
  const log = readFileSync(process.argv[2], 'utf8')
  const urls = [...log.matchAll(/dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=[A-Za-z0-9_-]+)/g)]
  const url = urls.map(match => match[1]).findLast(value => new URL(value).origin === origin)
  if (!url) throw new Error('No saved launch URL')
  const auth = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(3000) })
  const cookie = auth.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
  if (auth.status !== 303 || !cookie) throw new Error('Launch token rejected')
  const response = await fetch(`${origin}/api/rdWorkflow/needsSetup`, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'client-request', rpcId: randomUUID(), method: 'rdWorkflow/needsSetup', payload: { args: {} } }),
    signal: AbortSignal.timeout(3000),
  })
  const data = await response.json()
  if (!response.ok || data.result?.ok !== true || typeof data.result.value !== 'boolean') throw new Error('R&D service unavailable')
  if (process.env.AI_RD_OPEN_BROWSER !== '0') {
    const opened = spawnSync('/usr/bin/open', [url], { stdio: 'ignore' })
    if (opened.error || opened.status !== 0) throw new Error('Browser did not open')
  }
  console.log(`工作台已在运行，已复用现有服务：http://127.0.0.1:${process.argv[3]}/`)
} catch (error) {
  // Missing/stale launch records and failed RPCs must not identify unrelated listeners as this app.
  console.error(`无法复用该端口上的工作台：${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
NODE
  then
    exit 0
  fi
  fail "端口 $port 已被占用，未启动新服务。请使用原工作台窗口，或通过 AI_RD_PORT 指定其他端口。"
fi

# Corepack uses the pnpm version pinned in package.json.
run_pnpm() {
  if command -v corepack >/dev/null; then
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack pnpm "$@"
  elif command -v pnpm >/dev/null; then
    pnpm "$@"
  else
    fail '未找到 pnpm / Corepack。请安装 pnpm 11.7.0 后重试。'
  fi
}

printf 'AI 研发工作台\n项目：%s\n' "$project_dir"
if [[ ! -f node_modules/.modules.yaml || ! -x node_modules/.bin/tsdown ]]; then
  printf '\n正在安装项目依赖……\n'
  run_pnpm install --frozen-lockfile
fi
if [[ "${AI_RD_REBUILD:-0}" == 1 || ! -f apps/cli/lib/bin.js || ! -f apps/web/dist/index.html || ! -f packages/client/rd-workbench/lib/client.js ]]; then
  printf '\n正在构建工作台，首次构建需要几分钟……\n'
  NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=12288}" run_pnpm run build:rd
fi

mkdir -p "$profile_home"
printf '\n工作台地址：http://127.0.0.1:%s/\n请保留此窗口，按 Ctrl+C 停止服务。\n日志：%s\n\n' "$port" "$launch_log"
# Foreground children receive the terminal's Ctrl+C; the private log supports repeat launches.
node scripts/rd/start.mjs "$@" 2>&1 | tee "$launch_log"
