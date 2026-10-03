/** Validated local Git checkouts and bounded, scope-checked file operations. */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createHash, randomUUID } from 'node:crypto'
import {
  readFileSync,
  writeFileSync,
  realpathSync,
  existsSync,
  statSync,
  mkdirSync,
  readdirSync,
  renameSync,
  unlinkSync,
} from 'node:fs'
import { resolve, relative, dirname, join, isAbsolute, sep } from 'node:path'
import type { Workspace, EntityId } from '@deepseek-ai/dsh-rd-contracts/types'
const exec = promisify(execFile)
/**
 * @param path - requested checkout root. @param branch - expected checked-out branch. @returns verified Git
 * facts without changing files or branches.
 */
export async function inspectWorkspace(path: string, branch: string): Promise<Workspace> {
  if (!isAbsolute(path)) throw new Error('ABSOLUTE_PATH_REQUIRED')
  const canonical = realpathSync(path)
  const options = { cwd: canonical, timeout: 15_000, maxBuffer: 2 * 1024 * 1024 }
  const root = (await exec('git', ['rev-parse', '--show-toplevel'], options)).stdout.trim()
  if (realpathSync(root) !== canonical) throw new Error('WORKSPACE_ROOT_REQUIRED')
  const current = (await exec('git', ['branch', '--show-current'], options)).stdout.trim()
  if (!current || current !== branch) throw new Error('BRANCH_MISMATCH')
  const head = (await exec('git', ['rev-parse', 'HEAD'], options)).stdout.trim()
  const status = (await exec('git', ['status', '--porcelain=v1', '--untracked-files=normal'], options)).stdout
  return {
    id: createHash('sha256').update(canonical).digest('hex').slice(0, 32) as EntityId,
    name: canonical.split(sep).at(-1) ?? canonical,
    path: canonical,
    branch: current,
    head,
    dirty: status.length > 0,
    host: 'local',
    checkedAt: new Date().toISOString(),
  }
}
/** File tools hold no ambient repository and validate scope before every access. */
export class WorkspaceFiles {
  /** Expected contents of files read or written during this execution. */
  private readonly hashes = new Map<string, string>()
  /**
   * @param root - validated canonical checkout. @param maxBytes - deployment limit. @param admit - revalidate
   * task, baseline and write ownership.
   */
  constructor(
    private readonly root: string,
    private readonly maxBytes: number,
    private readonly admit: () => void,
  ) {}
  /** @param path - relative file path. @returns bounded UTF-8 source. */
  read(path: string): string {
    this.admit()
    const full = this.safe(path)
    if (statSync(full).size > this.maxBytes) throw new Error('FILE_TOO_LARGE')
    const content = readFileSync(full, 'utf8')
    this.hashes.set(full, this.hash(content))
    return content
  }
  /** @param path - relative directory. @returns bounded immediate entries, excluding private execution data. */
  list(path: string): string[] {
    this.admit()
    return readdirSync(this.safe(path))
      .filter(name => !['.git', 'node_modules', '.local', '.dsh'].includes(name) && !name.startsWith('.env'))
      .slice(0, 300)
  }
  /** @param path - relative source file. @param content - replacement UTF-8 source. */
  write(path: string, content: string): void {
    this.admit()
    if (Buffer.byteLength(content) > this.maxBytes) throw new Error('FILE_TOO_LARGE')
    const full = this.safe(path)
    if (existsSync(full)) {
      const expected = this.hashes.get(full)
      if (!expected) throw new Error('READ_BEFORE_WRITE')
      if (this.hash(readFileSync(full, 'utf8')) !== expected) throw new Error('FILE_CHANGED_EXTERNALLY')
    }
    mkdirSync(dirname(full), { recursive: true })
    const parent = realpathSync(dirname(full))
    if (!this.inside(parent)) throw new Error('OUTSIDE_WORKSPACE')
    this.admit()
    const temporary = join(parent, `.rd-edit-${randomUUID()}`)
    try {
      writeFileSync(temporary, content, { flag: 'wx', mode: existsSync(full) ? statSync(full).mode : 0o644 })
      renameSync(temporary, full)
      this.hashes.set(full, this.hash(content))
    } finally {
      if (existsSync(temporary)) unlinkSync(temporary)
    }
  }
  /** Resolve existing ancestors so symbolic links cannot escape the selected checkout. */
  private safe(path: string): string {
    if (isAbsolute(path)) throw new Error('OUTSIDE_WORKSPACE')
    const parts = path.split(/[\\/]/)
    if (parts.includes('.git')) throw new Error('GIT_METADATA_FORBIDDEN')
    if (parts.some(p => ['.local', '.dsh', '.credentials.yaml'].includes(p) || /^\.env(?:\.|$)/.test(p)))
      throw new Error('PRIVATE_FILE_FORBIDDEN')
    const full = resolve(this.root, path)
    if (!this.inside(full)) throw new Error('OUTSIDE_WORKSPACE')
    let ancestor = full
    while (!existsSync(ancestor)) ancestor = dirname(ancestor)
    const canonical = realpathSync(ancestor)
    if (
      relative(this.root, canonical)
        .split(sep)
        .some(p => ['.git', '.dsh', '.local', '.credentials.yaml'].includes(p) || /^\.env(?:\.|$)/.test(p))
    )
      throw new Error('PRIVATE_FILE_FORBIDDEN')
    if (!this.inside(canonical)) throw new Error('OUTSIDE_WORKSPACE')
    return full
  }
  /** Check a canonical or lexically resolved location. */
  private inside(path: string): boolean {
    const rel = relative(this.root, path)
    return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel))
  }
  /** Compare exact UTF-8 contents rather than modification timestamps. */
  private hash(text: string): string {
    return createHash('sha256').update(text).digest('hex')
  }
}
