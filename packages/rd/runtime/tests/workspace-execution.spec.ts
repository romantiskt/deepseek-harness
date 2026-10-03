import { afterEach, beforeEach, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { WorkspaceFiles, inspectWorkspace } from '../src/workspaces.ts'
let dir: string
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'rd-workspace-'))
  execFileSync('git', ['init', '-b', 'main', dir])
  writeFileSync(join(dir, 'index.js'), 'export const value = 1\n')
  execFileSync('git', ['-C', dir, 'add', '.'])
  execFileSync('git', ['-C', dir, '-c', 'user.name=Test', '-c', 'user.email=test@localhost', 'commit', '-m', 'fixture'])
})
afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})
it('writesOnlySelectedWorkspace and rejects symlink escapes', async () => {
  const workspace = await inspectWorkspace(dir, 'main')
  const files = new WorkspaceFiles(workspace.path, 10000, () => {})
  files.read('index.js')
  files.write('index.js', 'export const value = 2\n')
  expect(readFileSync(join(dir, 'index.js'), 'utf8')).toContain('2')
  expect(() => {
    files.write('../escape.txt', 'no')
  }).toThrow('OUTSIDE_WORKSPACE')
  symlinkSync(tmpdir(), join(dir, 'escape'))
  expect(() => {
    files.write('escape/no.txt', 'no')
  }).toThrow('OUTSIDE_WORKSPACE')
})
it('preservesDirtyFiles', async () => {
  writeFileSync(join(dir, 'index.js'), 'local unsaved work\n')
  expect((await inspectWorkspace(dir, 'main')).dirty).toBe(true)
  expect(readFileSync(join(dir, 'index.js'), 'utf8')).toBe('local unsaved work\n')
})
it('checks admission before every write and never mutates Git internals', async () => {
  const workspace = await inspectWorkspace(dir, 'main')
  let paused = false
  const files = new WorkspaceFiles(workspace.path, 10000, () => {
    if (paused) throw new Error('SCOPE_PAUSED')
  })
  expect(() => {
    files.write('.git/config', 'no')
  }).toThrow('GIT_METADATA_FORBIDDEN')
  paused = true
  expect(() => {
    files.write('index.js', 'no')
  }).toThrow('SCOPE_PAUSED')
  expect(readFileSync(join(dir, 'index.js'), 'utf8')).toContain('1')
})
