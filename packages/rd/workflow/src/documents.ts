/** Markdown files projected from committed workflow records. */
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { randomUUID } from 'node:crypto'
import type { Artifact, ProjectState, StageId, Version } from '@deepseek-ai/dsh-rd-contracts/types'
import { workflowTemplate } from './workflow-template.ts'

/** Encode stored identities as one filename segment, including imported identities. */
function segment(id: string): string {
  return encodeURIComponent(id).replaceAll('.', '%2E')
}

/** Keep titles inside a single Markdown heading or link. */
function label(text: string): string {
  return text.replaceAll(/[\r\n]/g, ' ').replaceAll(/([\[\]\\])/g, '\\$1')
}

/** Quote a local path for POSIX shells without evaluating user text. */
function shellPath(path: string): string {
  return `'${path.replaceAll("'", "'\\''")}'`
}

/** Include both a native file link and commands for file managers. */
function folderInstructions(directory: string): string {
  return `## 本地文件夹\n\n[打开产物文件夹](${pathToFileURL(directory).href})\n\n路径：\`${directory}\`\n\n浏览器不允许打开本地链接时，可复制路径到文件管理器，或在产物所在机器执行：\n\n\`\`\`sh\n# macOS\nopen ${shellPath(directory)}\n# Linux\nxdg-open ${shellPath(directory)}\n\`\`\`\n\nWindows PowerShell：\n\n\`\`\`powershell\nInvoke-Item -LiteralPath '${directory.replaceAll("'", "''")}'\n\`\`\``
}

/** Render structured drafts as editable prose while preserving unrecognized source text. */
function artifactBody(artifact: Artifact): string {
  if (artifact.kind !== 'draft.requirement') return artifact.text
  let draft: unknown
  try {
    draft = JSON.parse(artifact.text)
  } catch (_invalidDraft) {
    return artifact.text
  }
  if (!draft || typeof draft !== 'object' || !('content' in draft) || !('acceptance' in draft)
    || typeof draft.content !== 'string' || typeof draft.acceptance !== 'string') return artifact.text
  return `${draft.content}\n\n## 验收标准\n\n${draft.acceptance}`
}

/** Prefer business evidence ownership over the stage the author happened to browse. */
function belongsToStage(version: Version, artifact: Artifact, stage: StageId): boolean {
  const definition = workflowTemplate.find(s => s.id === stage)
  if (definition?.nodes.some(n => version.nodes[n.id]?.artifactIds.includes(artifact.id))) return true
  if (stage === 'requirements' && version.requirementIds.some(id => id === artifact.scope.requirementId)) return true
  return artifact.scope.versionId === version.id && artifact.scope.stageId === stage
}

/** Render entity fields without discarding test evidence or nested baseline references. */
function records(title: string, values: readonly object[]): string {
  if (!values.length) return `## ${title}\n\n暂无记录`
  return `## ${title}\n\n${values.map(value => `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``).join('\n\n')}`
}

/** Collect the business records whose outcomes belong to a stage. */
function stageRecords(project: ProjectState, version: Version, stage: StageId): string {
  switch (stage) {
    case 'requirements':
      return records('需求与验收标准', project.requirements.filter(r => version.requirementIds.includes(r.id)))
    case 'design':
      return records('冻结基线', version.baselines)
    case 'development': {
      const tasks = project.tasks.filter(t => t.versionId === version.id)
      return `${records('开发任务', tasks)}\n\n${records('开发工作区', project.workspaces.filter(w => tasks.some(t => t.workspaceId === w.id)))}`
    }
    case 'testing':
      return `${records('提测、用例与验收', project.submissions.filter(s => s.versionId === version.id))}\n\n${records('缺陷与复验', project.defects.filter(d => d.versionId === version.id))}`
    case 'release':
      return `## 发布证据\n\n${version.releaseEvidence ? `[发布记录](../../artifacts/${segment(version.releaseEvidence)}.md)` : '暂无发布记录'}`
    case 'feedback':
      return records('范围变更', project.changes.filter(c => c.versionId === version.id))
  }
}

/** Regenerable indexes and immutable artifact files beside one workflow database. */
export class WorkflowDocuments {
  /** Last fully materialized revision per project; only advanced after every file succeeds. */
  private readonly revisions = new Map<string, number>()

  /**
   * Configure the private Markdown root.
   * @param root - deployment-owned directory beside the database.
   */
  constructor(private readonly root: string) {}

  /**
   * Locate one project's generated files.
   * @param projectId - authorized project identity.
   * @returns absolute directory.
   */
  directory(projectId: string): string {
    return join(this.root, segment(projectId))
  }

  /** Atomically publish a complete file; immutable revisions are never overwritten. */
  private write(path: string, text: string, immutable = false): void {
    if (immutable && existsSync(path)) return
    const contents = `${text.trimEnd()}\n`
    if (existsSync(path) && readFileSync(path, 'utf8') === contents) return
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
    const temporary = `${path}.${randomUUID()}.tmp`
    writeFileSync(temporary, contents, { mode: 0o600, flag: 'wx' })
    try {
      renameSync(temporary, path)
    } finally {
      rmSync(temporary, { force: true })
    }
  }

  /**
   * Materialize committed records, including older projects on their first read.
   * @param project - database-authoritative aggregate without credentials.
   * @returns absolute project document directory.
   */
  sync(project: ProjectState): string {
    const directory = this.directory(project.id)
    if (this.revisions.get(project.id) === project.revision && existsSync(join(directory, 'README.md'))) return directory
    const folders = folderInstructions(directory)
    for (const artifact of project.artifacts) {
      this.write(join(directory, 'artifacts', `${segment(artifact.id)}.md`),
        `# ${label(artifact.title)}\n\n- 资料 ID：${artifact.id}\n- 类型：${artifact.kind}\n- 项目修订：${artifact.revision}\n- 基线：${artifact.baseline}\n- 创建时间：${artifact.createdAt}\n- 创建成员：${artifact.createdBy}\n\n${artifactBody(artifact)}\n\n${folders}`, true)
    }
    for (const version of project.versions) {
      const versionDirectory = join(directory, 'versions', segment(version.id))
      for (const stage of workflowTemplate) {
        const nodes = stage.nodes.map((node) => {
          const result = version.nodes[node.id]
          const links = result?.artifactIds.map(id => `- [${label(project.artifacts.find(a => a.id === id)?.title ?? id)}](../../artifacts/${segment(id)}.md)`).join('\n') ?? ''
          return `### ${node.id} · ${node.title}\n\n状态：${result?.outcome ?? 'pending'}\n\n${result?.note ?? '等待完成此节点'}${result?.candidateCommit ? `\n\n候选提交：\`${result.candidateCommit}\`` : ''}${links ? `\n\n${links}` : ''}`
        }).join('\n\n')
        const artifacts = project.artifacts.filter(a => belongsToStage(version, a, stage.id))
          .map(a => `- [${label(a.title)} · R${a.revision}](../../artifacts/${segment(a.id)}.md)`).join('\n')
        this.write(join(versionDirectory, `${stage.id}.md`),
          `# ${label(version.title)} · ${stage.title}\n\n项目修订：${project.revision} · 版本状态：${version.status}\n\n[版本目录](README.md)\n\n${nodes}\n\n## 阶段资料\n\n${artifacts || '暂无资料'}\n\n${stageRecords(project, version, stage.id)}\n\n${folderInstructions(versionDirectory)}`)
      }
      this.write(join(versionDirectory, 'README.md'),
        `# ${label(version.title)}\n\n状态：${version.status} · 计划日期：${version.targetDate || '未设置'}\n\n${workflowTemplate.map(stage => `- [${stage.title}](${stage.id}.md)`).join('\n')}\n\n${folderInstructions(versionDirectory)}`)
    }
    this.write(join(directory, 'README.md'),
      `# ${label(project.name)} · 研发产物\n\n项目修订：${project.revision}\n\n阶段索引随业务操作更新；资料修订文件保留原文。请在工作台提交修订，直接编辑文件不会更新业务记录。\n\n## 版本\n\n${project.versions.map(v => `- [${label(v.title)}](versions/${segment(v.id)}/README.md)`).join('\n') || '暂无版本'}\n\n${records('待排期需求', project.requirements.filter(r => !r.versionId))}\n\n## 全部资料\n\n${project.artifacts.map(a => `- [${label(a.title)} · R${a.revision}](artifacts/${segment(a.id)}.md)`).join('\n') || '暂无资料'}\n\n${folders}`)
    this.revisions.set(project.id, project.revision)
    return directory
  }
}
