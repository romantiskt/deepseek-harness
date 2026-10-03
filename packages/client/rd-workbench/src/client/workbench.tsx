/** Conversation-led project page; all persisted actions go through the host. */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react'
import clsx from 'clsx'
import { Button, Modal, MarkdownText, IconPluginPinwheelOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  PropsRuntime,
  PropsLocale,
  PropsStore,
  InjectFace,
  HostObservable,
} from '@deepseek-ai/dsh-client-ui-slots'
import type { WorkflowScope, EntityId, Requirement } from '@deepseek-ai/dsh-rd-contracts/types'
import type { WorkflowCommand } from '@deepseek-ai/dsh-rd-contracts'
import type { createWorkbenchStore } from './workbench-store.ts'
import type { ChatView } from './chat-model.ts'
import { Operations } from './operations.tsx'
import type { ModelView } from './model.ts'
import type { RdKey } from './locales.ts'
import { filterArtifacts, readDraft } from './presentation.ts'
import css from './workbench.module.css'

/** Explicit callbacks and one host-state observable for the workbench entry. */
export interface WorkbenchFace {
  /** Sidebar destination selecting the page's lower panel. */ view:
    | 'work'
    | 'requirements'
    | 'versions'
    | 'workspaces'
    | 'testing'
  /** Current authorized business data. */ hooks: { model: HostObservable<ModelView>; chat: HostObservable<ChatView> }
  /** Read this exact conversation scope. */ selectContext: (scope: WorkflowScope, task: string) => void
  /** Admit a human prompt. */ send: (text: string) => Promise<boolean>
  /** Stop the selected execution. */ stop: () => Promise<void>
  /** Register a validated current checkout. */ registerWorkspace: (path: string, branch: string) => Promise<boolean>
  /** Read current source differences. */ diff: (workspaceId: string) => Promise<string>
  /** Run a selected package script and persist its evidence. */ check: (
    taskId: string,
    script: string,
  ) => Promise<boolean>
  /** Member sign-in. */ signIn: (values: {
    username: string
    password: string
    name: string
    project: string
  }) => Promise<void>
  /** Revoke the local session. */ signOut: () => Promise<void>
  /** Re-read authoritative state. */ refresh: () => Promise<void>
  /** Single authorized write entry. */ execute: (
    command: WorkflowCommand,
    scope: WorkflowScope,
    revision?: number,
  ) => Promise<boolean>
  /** Return to the upstream Harness conversation and settings. */ openHarness: () => void
}
/** Framework-derived page properties. */
export type WorkbenchProps = PropsRuntime<'main'> &
  PropsLocale<'rd'> &
  PropsStore<ReturnType<typeof createWorkbenchStore>> &
  InjectFace<WorkbenchFace>
/** A field in a context-bound business action dialog. */
export interface Field {
  /** Form submission key. */
  key: string
  /** Locale key for the visible field label. */
  labelKey: RdKey
  /** Initial editable value. */
  value?: string | undefined
  /** Use a multi-line editor for document content. */
  multiline?: boolean
  /** Available options for a finite selection. */
  choices?: { value: string; label: string }[]
  /** Permit an empty value. */
  optional?: boolean
  /** Mask local credential input. */
  secret?: boolean
  /** Display fetched evidence without editing it. */
  readonly?: boolean
}
/** Local dialog state keeps the original scope in its submit callback. */
interface ActionDialog {
  /** Localized action heading. */
  title: string
  /** Explicit inputs for the captured operation. */
  fields: Field[]
  /** Execute in the original business context. */
  submit: (values: Record<string, string>) => Promise<boolean>
}
/** Read only scalar form values; file entries never become credentials. */
function formText(data: FormData, key: string): string {
  const value = data.get(key)
  return typeof value === 'string' ? value : ''
}
/** @param props - named dialog and localized controls. @returns an accessible native form. */
function ActionForm({
  dialog,
  close,
  t,
  busy,
  failure,
}: {
  dialog: ActionDialog
  close: () => void
  t: WorkbenchProps['t']
  busy: boolean
  failure: string
}): ReactNode {
  const [error, setError] = useState('')
  return (
    <Modal open title={dialog.title} closeLabel={t('close')} onClose={close} contentClassName={css.modalContent ?? ''}>
      <form
        className={css.form}
        onSubmit={(event) => {
          event.preventDefault()
          const values = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>
          setError('')
          void dialog
            .submit(values)
            .then((ok) => {
              if (ok) close()
            })
            .catch((error: unknown) => {
              setError(String(error))
            })
        }}
      >
        {dialog.fields.map(field => (
          <label key={field.key}>
            {t(field.labelKey)}
            {field.choices ? (
              <select
                name={field.key}
                aria-label={t(field.labelKey)}
                defaultValue={field.value ?? field.choices[0]?.value}
              >
                {field.choices.map(choice => (
                  <option key={choice.value} value={choice.value}>
                    {choice.label}
                  </option>
                ))}
              </select>
            ) : field.multiline ? (
              <textarea
                name={field.key}
                aria-label={t(field.labelKey)}
                defaultValue={field.value}
                rows={5}
                readOnly={field.readonly}
                required={!field.optional}
              />
            ) : (
              <input
                name={field.key}
                aria-label={t(field.labelKey)}
                type={field.secret ? 'password' : 'text'}
                defaultValue={field.value}
                required={!field.optional}
              />
            )}
          </label>
        ))}
        {(error || failure) && (
          <p role="alert" className={css.error}>
            {error || failure}
          </p>
        )}
        <div className={css.formActions}>
          <Button onClick={close}>{t('cancel')}</Button>
          <Button variant="primary" type="submit" disabled={busy}>
            {t(busy ? 'busy' : 'save')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
/** @param props - workbench data and callbacks. @returns the six-stage R&D page. */
export function Workbench(props: WorkbenchProps): ReactNode {
  const { t, actions } = props
  const model = props.useModel(v => v)
  const selection = props.useStore(v => v)
  const chat = props.useChat(v => v)
  const [dialog, setDialog] = useState<ActionDialog | null>(null)
  // Follow new replies only while the reader remains near the latest message.
  const transcript = useRef<HTMLDivElement>(null)
  const followLatest = useRef(true)
  const selectedVersion =
    model.snapshot?.project.versions.find(v => v.id === selection.versionId) ?? model.snapshot?.project.versions[0]
  const selectedRequirement = model.snapshot?.project.requirements.find(
    r => r.id === selection.requirementId && (!selectedVersion || r.versionId === selectedVersion.id),
  )
  const selectedStage = model.snapshot?.stages[selection.stage]
  const contextJson = model.snapshot
    ? JSON.stringify({
      projectId: model.snapshot.project.id,
      ...(selectedVersion ? { versionId: selectedVersion.id } : {}),
      ...(selectedRequirement ? { requirementId: selectedRequirement.id } : {}),
      stageId: selectedStage?.id,
      nodeId: selection.nodeId,
    })
    : ''
  useEffect(() => {
    if (contextJson) props.selectContext(JSON.parse(contextJson) as WorkflowScope, selection.taskId)
  }, [contextJson, selection.taskId, selectedVersion?.baselines.length, props.selectContext])
  useEffect(() => { followLatest.current = true }, [contextJson, selection.taskId])
  useLayoutEffect(() => {
    const element = transcript.current
    if (element && followLatest.current) element.scrollTop = element.scrollHeight
  }, [chat.messages, chat.status])
  if (model.status === 'loading') return <div className={css.center}>{t('loading')}</div>
  if (model.status === 'error')
    return (
      <div className={css.center}>
        <p role="alert">{model.error}</p>
        <Button
          onClick={() => {
            void props.refresh()
          }}
        >
          {t('retry')}
        </Button>
      </div>
    )
  if (!model.snapshot)
    return (
      <div className={css.login}>
        <div className={css.loginCard}>
          <span className={css.brandMark}>✦</span>
          <h1>{t(model.status === 'setup' ? 'setup' : 'login')}</h1>
          <p>{t('setupHint')}</p>
          <form
            className={css.form}
            onSubmit={(event) => {
              event.preventDefault()
              const data = new FormData(event.currentTarget)
              void props.signIn({
                username: formText(data, 'username'),
                password: formText(data, 'password'),
                name: formText(data, 'name'),
                project: formText(data, 'project'),
              })
            }}
          >
            <label>
              {t('username')}
              <input name="username" required autoComplete="username" />
            </label>
            <label>
              {t('password')}
              <input
                name="password"
                type="password"
                minLength={12}
                required
                autoComplete={model.status === 'setup' ? 'new-password' : 'current-password'}
              />
            </label>
            {model.status === 'setup' && (
              <>
                <label>
                  {t('name')}
                  <input name="name" required />
                </label>
                <label>
                  {t('projectName')}
                  <input name="project" required />
                </label>
              </>
            )}
            {model.error && (
              <p className={css.error} role="alert">
                {model.error}
              </p>
            )}
            <Button variant="primary" type="submit" disabled={model.busy}>
              {t('enter')}
            </Button>
          </form>
        </div>
      </div>
    )
  const { project, stages, actor, members } = model.snapshot
  const version = project.versions.find(v => v.id === selection.versionId) ?? project.versions[0]
  const stage = stages[selection.stage] ?? stages[0]
  if (!stage) return <div>{t('empty')}</div>
  const requirement = selectedRequirement
  const scope: WorkflowScope = {
    projectId: project.id,
    ...(version ? { versionId: version.id } : {}),
    ...(requirement ? { requirementId: requirement.id } : {}),
    stageId: stage.id,
    nodeId: selection.nodeId,
  }
  const scopeKey = JSON.stringify(scope)
  const draft = selection.drafts[scopeKey] ?? ''
  const node = stage.nodes.find(n => n.id === selection.nodeId) ?? stage.nodes[0]
  if (!node) return <div>{t('empty')}</div>
  const artifacts = filterArtifacts(project.artifacts, scope)
  const versionRequirements = project.requirements.filter(r => version?.requirementIds.includes(r.id))
  const memberOptions = members.map(m => ({ value: m.id, label: m.name }))
  const resultOptions = ['passed', 'changes', 'rejected', ...(node.id === '10' ? ['not-applicable'] : [])].map(
    value => ({ value, label: t(value as RdKey) }),
  )
  /** Bind dialog writes to the context selected when the dialog opened. */
  const open = (
    title: RdKey,
    /** Explicit inputs for the captured operation. */
    fields: Field[],
    build: (v: Record<string, string>) => WorkflowCommand,
    context: WorkflowScope = scope,
  ): void => {
    setDialog({
      title: t(title),
      fields,
      submit: values => props.execute(build(values), { ...context }, project.revision),
    })
  }
  /** Open a runtime form with the captured selection. */
  const custom = (
    title: RdKey,
    /** Explicit inputs for the captured operation. */
    fields: Field[],
    /** Execute in the original business context. */
    submit: (values: Record<string, string>) => Promise<boolean>,
  ): void => {
    setDialog({ title: t(title), fields, submit })
  }
  /** Create or revise a structured requirement document. */
  const editRequirement = (existing?: Requirement): void => {
    open(
      existing ? 'edit' : 'newRequirement',
      [
        { key: 'title', labelKey: 'title', value: existing?.title },
        { key: 'content', labelKey: 'content', multiline: true, value: existing?.content },
        { key: 'acceptance', labelKey: 'acceptance', multiline: true, value: existing?.acceptance },
        {
          key: 'priority',
          labelKey: 'priority',
          choices: ['P0', 'P1', 'P2'].map(value => ({ value, label: value })),
          value: existing?.priority ?? 'P1',
        },
        { key: 'owner', labelKey: 'owner', choices: memberOptions, value: existing?.ownerId ?? actor.id },
      ],
      v =>
        ({
          type: existing ? 'requirement.revise' : 'requirement.create',
          ...(existing ? { requirementId: existing.id } : {}),
          title: v.title ?? '',
          content: v.content ?? '',
          acceptance: v.acceptance ?? '',
          priority: v.priority as 'P0' | 'P1' | 'P2',
          ownerId: v.owner as EntityId,
        }) as WorkflowCommand,
      existing
        ? {
          projectId: project.id,
          requirementId: existing.id,
          ...(existing.versionId ? { versionId: existing.versionId } : {}),
        }
        : { projectId: project.id, ...(version ? { versionId: version.id } : {}) },
    )
  }
  /** Open a version planning form. */
  const newVersion = (): void => {
    open(
      'newVersion',
      [
        { key: 'title', labelKey: 'title' },
        { key: 'date', labelKey: 'targetDate', optional: true },
        { key: 'owner', labelKey: 'owner', choices: memberOptions },
      ],
      v => ({ type: 'version.create', title: v.title ?? '', targetDate: v.date ?? '', ownerId: v.owner as EntityId }),
    )
  }
  /** Collect evidence first and attach the committed document to its node. */
  const nodeAction = (): void => {
    if (!version) return
    setDialog({
      title: t(node.mode === 'approval' ? 'review' : 'record'),
      fields: [
        { key: 'note', labelKey: 'note', multiline: true },
        { key: 'evidence', labelKey: 'evidence', multiline: true },
        ...(['14', '15', '16', '17'].includes(node.id) ? [{ key: 'commit', labelKey: 'commit' as const }] : []),
        ...(node.mode === 'approval' ? [{ key: 'outcome', labelKey: 'outcome' as const, choices: resultOptions }] : []),
      ],
      submit: async (values) => {
        return props.execute(
          {
            type: 'node.submitEvidence',
            versionId: version.id,
            nodeId: node.id,
            ...(['14', '15', '16', '17'].includes(node.id) ? { candidateCommit: values.commit ?? '' } : {}),
            note: values.note ?? '',
            evidence: values.evidence ?? '',
            outcome: (values.outcome ?? 'passed') as 'passed' | 'changes' | 'rejected' | 'not-applicable',
          },
          { ...scope, nodeId: node.id },
        )
      },
    })
  }
  return (
    <div className={css.workbench}>
      <header className={css.header}>
        <div>
          <div className={css.eyebrow}>
            {project.name}
            <span> / </span>
            {t(props.view)}
          </div>
          <div className={css.heading}>
            <h1>{version?.title ?? t('noVersion')}</h1>
            {version && <span className={css.status}>{t(version.status)}</span>}
          </div>
          <p>{t('tagline')}</p>
        </div>
        <div className={css.headerActions}>
          <Button variant="outline" disabled={!actor.roles.includes('product')} onClick={newVersion}>
            {t('newVersion')}
          </Button>
          <Button
            variant="primary"
            disabled={!actor.roles.includes('product')}
            onClick={() => {
              editRequirement()
            }}
          >
            {t('newRequirement')}
          </Button>
          <Button
            onClick={() => {
              void props.signOut()
            }}
          >
            {actor.name} · {t('logout')}
          </Button>
        </div>
      </header>
      <nav className={css.stages} aria-label={t('nodes')}>
        {stages.map((s, i) => (
          <button
            key={s.id}
            className={clsx(css.stage, i === selection.stage && css.selectedStage)}
            onClick={() => {
              actions.stage(i, s.nodes[0]?.id ?? '')
            }}
          >
            <span>{i + 1}</span>
            <div>
              <strong>{s.title}</strong>
              <small>
                {s.nodes.filter(n => version?.nodes[n.id]?.outcome === 'passed').length} / {s.nodes.length}
              </small>
            </div>
          </button>
        ))}
      </nav>
      <div className={css.contextBar}>
        <select
          aria-label={t('chooseVersion')}
          value={version?.id ?? ''}
          onChange={(e) => {
            actions.version(e.target.value)
          }}
        >
          <option value="" disabled>
            {t('chooseVersion')}
          </option>
          {project.versions.map(v => (
            <option key={v.id} value={v.id}>
              {v.title}
            </option>
          ))}
        </select>
        <select
          aria-label={t('chooseRequirement')}
          value={requirement?.id ?? ''}
          onChange={(e) => {
            actions.requirement(e.target.value)
          }}
        >
          <option value="">{t('allRequirements')}</option>
          {versionRequirements.map(r => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </select>
        <span>
          {t('baseline')} {version?.baselines.at(-1)?.number ?? '—'}
        </span>
        <Button
          size="sm"
          onClick={() => {
            void props.refresh()
          }}
        >
          {t('refresh')}
        </Button>
      </div>
      {model.error && (
        <div className={css.error} role="alert">
          {model.error}
        </div>
      )}
      <div
        className={clsx(css.columns, selection.focus && css.focus)}
        style={{ '--rd-chat-width': `${selection.width}%` } as CSSProperties}
      >
        <section className={css.conversation}>
          <div className={css.panelHead}>
            <div>
              <span className={css.aiMark}>✦</span>
              <strong>{t('aiTitle')}</strong>
              <span className={css.muted}>{t('aiBadge')}</span>
            </div>
            <Button size="sm" onClick={actions.focus}>
              {t(selection.focus ? 'restore' : 'focus')}
            </Button>
          </div>
          <div className={css.chatBody} ref={transcript} data-testid="rd-chat-transcript" onScroll={(event) => {
            const element = event.currentTarget
            followLatest.current = element.scrollHeight - element.scrollTop - element.clientHeight < 96
          }}>
            {chat.loading ? (
              <p>{t('loading')}</p>
            ) : chat.messages.length ? (
              chat.messages.map(message => (
                <article className={clsx(css.message, message.role === 'user' && css.userMessage)} key={message.id}>
                  <strong>
                    {t(message.role === 'user' ? 'you' : message.role === 'system' ? 'system' : 'assistant')}
                  </strong>
                  {message.role === 'assistant' ? (
                    <MarkdownText
                      text={message.text}
                      labels={{ code: { copyLabel: t('copy'), copiedLabel: t('copied') }, footnotes: t('footnotes') }}
                    />
                  ) : (
                    <div>{message.text}</div>
                  )}
                </article>
              ))
            ) : (
              <div className={css.welcome}>
                <span className={css.heroMark}>✦</span>
                <h2>{t('chatEmpty')}</h2>
                <p>{t('chatHint')}</p>
                <div className={css.suggestions}>
                  {(['suggestRequirement', 'suggestReview', 'suggestPlan'] as const).map(key => (
                    <button
                      key={key}
                      onClick={() => {
                        actions.compose(scopeKey, t(key))
                      }}
                    >
                      {t(key)}
                      <span>↗</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chat.error && (
              <p role="alert" className={css.error}>
                {chat.error}
              </p>
            )}
            {chat.status === 'running' && <p className={css.muted}>{t('thinking')}</p>}
          </div>
          <div className={css.composer}>
            <div className={css.contextChips}>
              <span>{version?.title ?? t('projectScope')}</span>
              <span>{stage.title}</span>
              {requirement && <span>{requirement.title}</span>}
              {selection.taskId && (
                <button
                  onClick={() => {
                    actions.task('')
                  }}
                >
                  {project.tasks.find(task => task.id === selection.taskId)?.title} ×
                </button>
              )}
            </div>
            <textarea
              aria-label={t('aiTitle')}
              placeholder={t('placeholder')}
              value={draft}
              onChange={(e) => {
                actions.compose(scopeKey, e.target.value)
              }}
            />
            <div className={css.composerFoot}>
              <Button size="sm" onClick={props.openHarness}>
                {t('modelSettings')}
              </Button>
              {chat.status === 'running' ? (
                <Button
                  variant="primary"
                  onClick={() => {
                    void props.stop()
                  }}
                >
                  {t('stop')}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  disabled={!draft.trim() || chat.loading}
                  onClick={() => {
                    followLatest.current = true
                    void props.send(draft).then((ok) => {
                      if (ok) actions.compose(scopeKey, '')
                    })
                  }}
                >
                  {t('send')} ↑
                </Button>
              )}
            </div>
          </div>
        </section>
        {!selection.focus && (
          <>
            <input
              className={css.splitter}
              type="range"
              min={45}
              max={75}
              value={selection.width}
              aria-label={t('split')}
              onChange={(e) => {
                actions.width(Number(e.target.value))
              }}
            />
            <aside className={css.details}>
              <div className={css.tabs}>
                {(['nodes', 'artifacts', 'activity'] as const).map(tab => (
                  <button
                    key={tab}
                    className={clsx(selection.tab === tab && css.activeTab)}
                    onClick={() => {
                      actions.tab(tab)
                    }}
                  >
                    {t(tab)}
                  </button>
                ))}
              </div>
              <div className={css.detailBody}>
                {selection.tab === 'nodes' && (
                  <>
                    <div className={css.sectionTitle}>
                      <h2>{stage.title}</h2>
                      <span>{stage.nodes.length}</span>
                    </div>
                    <p className={css.muted}>{t('reviewHint')}</p>
                    <div className={css.nodeList}>
                      {stage.nodes.map(n => (
                        <button
                          className={clsx(css.nodeCard, node.id === n.id && css.activeNode)}
                          key={n.id}
                          onClick={() => {
                            actions.node(n.id)
                          }}
                        >
                          <span className={css.nodeNumber}>{n.id}</span>
                          <div>
                            <strong>{n.title}</strong>
                            <small>{t(version?.nodes[n.id]?.outcome ?? 'pending')}</small>
                          </div>
                          <span>›</span>
                        </button>
                      ))}
                    </div>
                    <div className={css.nodeAction}>
                      <strong>{node.title}</strong>
                      <p>{version?.nodes[node.id]?.note ?? t('noSelection')}</p>
                      {node.mode !== 'derived' && (
                        <Button
                          variant="primary"
                          disabled={!version || model.busy || !actor.roles.includes(node.role)}
                          onClick={nodeAction}
                        >
                          {t(node.mode === 'approval' ? 'review' : 'record')}
                        </Button>
                      )}
                      {node.id === '11' && (
                        <Button
                          variant="primary"
                          disabled={!version || model.busy || !actor.roles.includes('product')}
                          onClick={() => {
                            if (version) void props.execute({ type: 'version.freeze', versionId: version.id }, scope)
                          }}
                        >
                          {t('freeze')}
                        </Button>
                      )}
                    </div>
                  </>
                )}
                {selection.tab === 'artifacts' &&
                  (artifacts.length ? (
                    artifacts.toReversed().map(a => (
                      <details className={css.artifact} key={a.id}>
                        <summary>
                          <strong>{a.title}</strong>
                          <small>{t('revision')} {a.revision}</small>
                        </summary>
                        {a.kind === 'draft.requirement' ? (
                          <MarkdownText
                            text={`${readDraft(a.text)?.content ?? a.text}\n\n${readDraft(a.text)?.acceptance ?? ''}`}
                            labels={{
                              code: { copyLabel: t('copy'), copiedLabel: t('copied') },
                              footnotes: t('footnotes'),
                            }}
                          />
                        ) : (
                          <pre>{a.text}</pre>
                        )}
                        {a.kind === 'draft.requirement' &&
                          !project.artifacts.some(saved => saved.kind === `draft.saved:${a.id}`) &&
                          actor.roles.includes('product') && (
                          <Button
                            size="sm"
                            onClick={() => {
                              const data = readDraft(a.text)
                              if (!data) return
                              const original = project.requirements.find(r => r.id === data.requirementId)
                              custom(
                                'saveDraft',
                                [
                                  {
                                    key: 'original',
                                    labelKey: 'originalRequirement',
                                    value: original
                                      ? `${original.content}\n${original.acceptance}`
                                      : t('newRequirement'),
                                    multiline: true,
                                    readonly: true,
                                    optional: true,
                                  },
                                  { key: 'title', labelKey: 'title', value: data.title },
                                  { key: 'content', labelKey: 'content', value: data.content, multiline: true },
                                  { key: 'acceptance', labelKey: 'acceptance', value: data.acceptance, multiline: true },
                                  {
                                    key: 'assign',
                                    labelKey: 'assign',
                                    choices: [
                                      { value: 'no', label: t('saveOnly') },
                                      ...(a.scope.versionId ? [{ value: 'yes', label: t('saveAndAssign') }] : []),
                                    ],
                                  },
                                ],
                                values =>
                                  props.execute(
                                    {
                                      type: 'requirement.saveDraft',
                                      artifactId: a.id,
                                      title: values.title ?? '',
                                      content: values.content ?? '',
                                      acceptance: values.acceptance ?? '',
                                      priority: original?.priority ?? 'P1',
                                      ownerId: original?.ownerId ?? actor.id,
                                      ...(values.assign === 'yes' && a.scope.versionId
                                        ? { versionId: a.scope.versionId }
                                        : {}),
                                    },
                                    { ...a.scope },
                                    project.revision,
                                  ),
                              )
                            }}
                          >
                            {t('saveDraft')}
                          </Button>
                        )}
                      </details>
                    ))
                  ) : (
                    <div className={css.empty}>{t('noArtifacts')}</div>
                  ))}
                {selection.tab === 'activity' &&
                  project.activities.toReversed().map(a => (
                    <div className={css.activity} key={a.id}>
                      <span className={css.activityDot} />
                      <div>
                        <strong>{a.summary}</strong>
                        <small>
                          {members.find(m => m.id === a.actorId)?.name} · {new Date(a.at).toLocaleString()}
                        </small>
                        {a.beforeState && (
                          <details>
                            <summary>{t('transition')}</summary>
                            <pre>
                              {a.beforeState} → {a.afterState}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </aside>
          </>
        )}
      </div>
      <section className={css.business}>
        <div className={css.sectionTitle}>
          <h2>{t(props.view === 'versions' ? 'scope' : props.view)}</h2>
          <span>
            {versionRequirements.length} {t('countRequirements')}
          </span>
        </div>
        {(props.view === 'requirements' ? project.requirements : versionRequirements).map(r => (
          <div className={css.requirementRow} key={r.id}>
            <div>
              <strong>{r.title}</strong>
              <p>
                {r.priority} · {t('revision')} {r.revision} · {t(r.review)}
              </p>
            </div>
            <div className={css.rowActions}>
              <Button
                size="sm"
                onClick={() => {
                  editRequirement(r)
                }}
              >
                {t('edit')}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  open(
                    'requirementReview',
                    [
                      { key: 'note', labelKey: 'note', multiline: true },
                      {
                        key: 'outcome',
                        labelKey: 'outcome',
                        choices: resultOptions.filter(o => o.value !== 'not-applicable'),
                      },
                    ],
                    values => ({
                      type: 'requirement.review',
                      requirementId: r.id,
                      note: values.note ?? '',
                      outcome: values.outcome as 'passed' | 'changes' | 'rejected',
                    }),
                    { projectId: project.id, requirementId: r.id, ...(r.versionId ? { versionId: r.versionId } : {}) },
                  )
                }}
              >
                {t('requirementReview')}
              </Button>
              {version && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void props.execute(
                      {
                        type: 'version.assign',
                        versionId: version.id,
                        requirementId: r.id,
                        included: r.versionId !== version.id,
                      },
                      { projectId: project.id, versionId: version.id },
                    )
                  }}
                >
                  {t(r.versionId === version.id ? 'remove' : 'assign')}
                </Button>
              )}
            </div>
          </div>
        ))}
        {!project.requirements.length && <div className={css.empty}>{t('startHint')}</div>}
      </section>
      <Operations
        snapshot={model.snapshot}
        version={version}
        scope={scope}
        view={props.view}
        stage={selection.stage}
        t={t}
        open={open}
        custom={custom}
        runtime={props}
        selectTask={actions.task}
        taskId={selection.taskId}
        todo={(versionId, index, nodeId) => {
          actions.version(versionId)
          actions.stage(index, nodeId)
        }}
      />
      <footer className={css.changeRail}>
        <span>↻</span>
        <div>
          <strong>{t('change')}</strong>
          <small>{t('changeHint')}</small>
        </div>
        <Button
          variant="outline"
          disabled={!version || !versionRequirements.length}
          onClick={() => {
            if (version)
              open(
                'change',
                [
                  {
                    key: 'requirement',
                    labelKey: 'chooseRequirement',
                    choices: versionRequirements.map(r => ({ value: r.id, label: r.title })),
                  },
                  { key: 'title', labelKey: 'title' },
                  { key: 'content', labelKey: 'content', multiline: true },
                  { key: 'acceptance', labelKey: 'acceptance', multiline: true },
                  { key: 'impact', labelKey: 'impact', multiline: true },
                  { key: 'nodes', labelKey: 'affectedNodes', value: '05,06,07,08,09,10,11,13,14,15,16,17,18,20,21' },
                ],
                v => ({
                  type: 'change.propose',
                  versionId: version.id,
                  requirementId: v.requirement as EntityId,
                  title: v.title ?? '',
                  content: v.content ?? '',
                  acceptance: v.acceptance ?? '',
                  impact: v.impact ?? '',
                  affectedNodes: (v.nodes ?? '').split(',').map(s => s.trim()),
                }),
              )
          }}
        >
          {t('change')}
        </Button>
      </footer>
      {dialog && (
        <ActionForm
          key={dialog.title + dialog.fields.map(f => f.value).join('')}
          dialog={dialog}
          close={() => {
            setDialog(null)
          }}
          t={t}
          busy={model.busy}
          failure={model.error}
        />
      )}
    </div>
  )
}
/** @param props - upstream sidebar icon properties. @returns R&D entry glyph. */
export function WorkbenchIcon({ size }: PropsRuntime<'sidebar.panellist'>): ReactNode {
  return <IconPluginPinwheelOutlineRegular size={size} />
}
