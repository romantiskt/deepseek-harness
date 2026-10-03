/** Human controls over the mainline; browsing never changes the workflow. */
import type { ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { WorkflowCommand } from '@deepseek-ai/dsh-rd-contracts'
import type { WorkbenchSnapshot, Version, WorkflowScope, EntityId, Role } from '@deepseek-ai/dsh-rd-contracts/types'
import type { Field, WorkbenchFace, WorkbenchProps } from './workbench.tsx'
import type { RdKey } from './locales.ts'
import css from './workbench.module.css'
/** Mainline section callbacks are bound to the selection captured by the parent. */
interface OperationsProps {
  /** Authorized business data. */ snapshot: WorkbenchSnapshot
  /** Currently viewed version. */ version: Version | undefined
  /** Current business context. */ scope: WorkflowScope
  /** Sidebar and stage selections. */ view: WorkbenchFace['view']
  /** Browsed stage index. */ stage: number
  /** Localized copy. */ t: WorkbenchProps['t']
  /** Open an atomic command form. */ open: (
    title: RdKey,
    fields: Field[],
    build: (values: Record<string, string>) => WorkflowCommand,
  ) => void
  /** Open a non-command operation form. */ custom: (
    title: RdKey,
    fields: Field[],
    submit: (values: Record<string, string>) => Promise<boolean>,
  ) => void
  /** Runtime adapters without host implementations. */ runtime: Pick<
    WorkbenchFace,
    'registerWorkspace' | 'diff' | 'check'
  >
  /** Start selected task context. */ selectTask: (id: string) => void
  /** Selected code task. */ taskId: string
  /** Jump to a human-owned pending node. */ todo: (versionId: string, stage: number, node: string) => void
}
/** @param props - selected state and explicit actions. @returns stage-appropriate controls. */
export function Operations({
  snapshot,
  version,
  view,
  stage,
  t,
  open,
  custom,
  runtime,
  selectTask,
  taskId,
  todo,
}: OperationsProps): ReactNode {
  const { project, actor, members, stages } = snapshot
  const tasks = project.tasks.filter(task => task.versionId === version?.id)
  const submission = project.submissions.find(s => s.id === version?.currentSubmissionId)
  const defects = project.defects.filter(d => d.versionId === version?.id)
  const ownerOptions = members.filter(m => m.roles.includes('developer')).map(m => ({ value: m.id, label: m.name }))
  const resultChoices = [
    { value: 'passed', label: t('passed') },
    { value: 'failed', label: t('failed') },
  ]
  const evidence: Field = { key: 'evidence', labelKey: 'evidence', multiline: true }
  const result: Field = { key: 'result', labelKey: 'result', choices: resultChoices }
  return (
    <>
      {view === 'work' && (
        <section className={css.business}>
          <h2>{t('work')}</h2>
          <div className={css.todoList}>
            {project.versions.flatMap(v =>
              stages.flatMap((s, index) =>
                s.nodes
                  .filter(
                    n =>
                      n.mode !== 'derived' &&
                      actor.roles.includes(n.role) &&
                      v.nodes[n.id]?.outcome !== 'passed' &&
                      v.nodes[n.id]?.outcome !== 'not-applicable' &&
                      v.status !== 'closed',
                  )
                  .map(n => (
                    <button
                      key={`${v.id}:${n.id}`}
                      onClick={() => {
                        todo(v.id, index, n.id)
                      }}
                    >
                      {v.title} · {n.id} {n.title}
                    </button>
                  )),
              ),
            )}
          </div>
        </section>
      )}
      {(view === 'workspaces' || stage === 2) && (
        <section className={css.business}>
          <div className={css.sectionTitle}>
            <h2>{t('task')}</h2>
            <span>{tasks.length}</span>
          </div>
          <div className={css.rowActions}>
            <Button
              disabled={!version || !actor.roles.includes('developer')}
              onClick={() => {
                if (version)
                  open(
                    'newTask',
                    [
                      { key: 'title', labelKey: 'title' },
                      { key: 'owner', labelKey: 'owner', choices: ownerOptions, value: actor.id },
                    ],
                    values => ({
                      type: 'task.create',
                      versionId: version.id,
                      title: values.title ?? '',
                      ownerId: values.owner as EntityId,
                    }),
                  )
              }}
            >
              {t('newTask')}
            </Button>
            <Button
              disabled={!actor.roles.includes('developer')}
              onClick={() => {
                custom(
                  'addWorkspace',
                  [
                    { key: 'path', labelKey: 'path' },
                    { key: 'branch', labelKey: 'branch' },
                  ],
                  values => runtime.registerWorkspace(values.path ?? '', values.branch ?? ''),
                )
              }}
            >
              {t('addWorkspace')}
            </Button>
            <Button
              disabled={!version || !actor.roles.includes('developer')}
              variant="primary"
              onClick={() => {
                if (version)
                  open(
                    'submitTest',
                    [
                      { key: 'commit', labelKey: 'commit' },
                      { key: 'artifact', labelKey: 'buildArtifact' },
                      { key: 'environment', labelKey: 'environment' },
                      { key: 'selfTest', labelKey: 'selfTest', multiline: true },
                    ],
                    values => ({
                      type: 'submission.create',
                      versionId: version.id,
                      commit: values.commit ?? '',
                      artifact: values.artifact ?? '',
                      environment: values.environment ?? '',
                      selfTest: values.selfTest ?? '',
                    }),
                  )
              }}
            >
              {t('submitTest')}
            </Button>
          </div>
          {tasks.map(task => (
            <div className={css.requirementRow} key={task.id}>
              <div>
                <strong>
                  {task.title}
                  {task.id === taskId ? ` · ${t('current')}` : ''}
                </strong>
                <p>
                  {members.find(m => m.id === task.ownerId)?.name} · {t(task.status)} · {t('baseline')} {task.baseline}
                </p>
                <small>{project.workspaces.find(w => w.id === task.workspaceId)?.path}</small>
              </div>
              <div className={css.rowActions}>
                <Button
                  size="sm"
                  disabled={task.ownerId !== actor.id}
                  onClick={() => {
                    open(
                      'bindWorkspace',
                      [
                        {
                          key: 'workspace',
                          labelKey: 'bindWorkspace',
                          choices: project.workspaces.map(w => ({
                            value: w.id,
                            label: `${w.name} · ${w.branch} · ${t(w.dirty ? 'dirty' : 'clean')}`,
                          })),
                        },
                      ],
                      values => ({
                        type: 'task.bindWorkspace',
                        taskId: task.id,
                        workspaceId: values.workspace as EntityId,
                      }),
                    )
                  }}
                >
                  {t('bindWorkspace')}
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  disabled={task.status !== 'working' || task.ownerId !== actor.id}
                  onClick={() => {
                    selectTask(task.id)
                  }}
                >
                  {t('startDevelopment')}
                </Button>
                <Button
                  size="sm"
                  disabled={!task.workspaceId}
                  onClick={() => {
                    if (!task.workspaceId) return
                    void runtime
                      .diff(task.workspaceId)
                      .then((diff) => {
                        custom(
                          'diff',
                          [
                            {
                              key: 'diff',
                              labelKey: 'diff',
                              value: diff || t('noDiff'),
                              multiline: true,
                              optional: true,
                              readonly: true,
                            },
                          ],
                          () => Promise.resolve(true),
                        )
                      })
                      .catch((error: unknown) => {
                        custom(
                          'diff',
                          [{ key: 'diff', labelKey: 'diff', value: String(error), multiline: true, readonly: true }],
                          () => Promise.resolve(true),
                        )
                      })
                  }}
                >
                  {t('diff')}
                </Button>
                <Button
                  size="sm"
                  disabled={task.status !== 'working' || task.ownerId !== actor.id}
                  onClick={() => {
                    custom(
                      'check',
                      [
                        {
                          key: 'script',
                          labelKey: 'command',
                          choices: ['test', 'build', 'lint'].map(value => ({ value, label: `${t('npmRun')} ${value}` })),
                        },
                      ],
                      values => runtime.check(task.id, values.script ?? ''),
                    )
                  }}
                >
                  {t('check')}
                </Button>
                <Button
                  size="sm"
                  disabled={task.status !== 'working' || task.ownerId !== actor.id}
                  onClick={() => {
                    open('completeTask', [{ key: 'note', labelKey: 'note', multiline: true }], values => ({
                      type: 'task.complete',
                      taskId: task.id,
                      note: values.note ?? '',
                    }))
                  }}
                >
                  {t('completeTask')}
                </Button>
              </div>
            </div>
          ))}
          <details>
            <summary>
              {t('workspaces')} · {project.workspaces.length}
            </summary>
            {project.workspaces.map(w => (
              <p key={w.id}>
                {w.path} · {w.branch} · {w.head.slice(0, 12)} · {t(w.dirty ? 'dirty' : 'clean')}
              </p>
            ))}
          </details>
        </section>
      )}
      {(view === 'testing' || stage === 3) && (
        <section className={css.business}>
          <div className={css.sectionTitle}>
            <h2>{t('testing')}</h2>
            <span>{submission?.commit.slice(0, 12)}</span>
          </div>
          {!submission ? (
            <p className={css.muted}>{t('noSubmission')}</p>
          ) : (
            <>
              <p>
                {submission.artifact} · {submission.environment} · {t('baseline')} {submission.baseline} · {t(submission.status)}
              </p>
              <div className={css.rowActions}>
                <Button
                  disabled={!actor.roles.includes('tester') || submission.status !== 'testing'}
                  onClick={() => {
                    open('addCase', [{ key: 'title', labelKey: 'title' }], values => ({
                      type: 'testCase.add',
                      submissionId: submission.id,
                      title: values.title ?? '',
                    }))
                  }}
                >
                  {t('addCase')}
                </Button>
                <Button
                  disabled={!actor.roles.includes('tester') || submission.status !== 'testing'}
                  onClick={() => {
                    open(
                      'newDefect',
                      [
                        { key: 'title', labelKey: 'title' },
                        {
                          key: 'severity',
                          labelKey: 'severity',
                          choices: ['blocker', 'major', 'minor'].map(value => ({ value, label: t(value as RdKey) })),
                        },
                        evidence,
                      ],
                      values => ({
                        type: 'defect.create',
                        submissionId: submission.id,
                        title: values.title ?? '',
                        severity: values.severity as 'blocker' | 'major' | 'minor',
                        evidence: values.evidence ?? '',
                      }),
                    )
                  }}
                >
                  {t('newDefect')}
                </Button>
                <Button
                  disabled={!actor.roles.includes('tester') || submission.status !== 'testing'}
                  onClick={() => {
                    open('testExit', [result, evidence], values => ({
                      type: 'submission.exit',
                      submissionId: submission.id,
                      passed: values.result === 'passed',
                      evidence: values.evidence ?? '',
                    }))
                  }}
                >
                  {t('testExit')}
                </Button>
                <Button
                  disabled={!actor.roles.includes('product') || submission.status !== 'passed'}
                  variant="primary"
                  onClick={() => {
                    open('uatApprove', [result, evidence], values => ({
                      type: 'uat.decide',
                      submissionId: submission.id,
                      passed: values.result === 'passed',
                      evidence: values.evidence ?? '',
                    }))
                  }}
                >
                  {t('uatApprove')} · {t(submission.uat)}
                </Button>
              </div>
              <h3>{t('testCases')}</h3>
              {submission.cases.map(c => (
                <div key={c.id} className={css.requirementRow}>
                  <span>
                    {c.title} · {t(c.result)}
                  </span>
                  <Button
                    size="sm"
                    disabled={!actor.roles.includes('tester') || submission.status !== 'testing'}
                    onClick={() => {
                      open('recordCase', [result, evidence], values => ({
                        type: 'testCase.record',
                        submissionId: submission.id,
                        caseId: c.id,
                        result: values.result as 'passed' | 'failed',
                        evidence: values.evidence ?? '',
                      }))
                    }}
                  >
                    {t('recordCase')}
                  </Button>
                </div>
              ))}
              <h3>{t('defects')}</h3>
              {defects.map(d => (
                <div key={d.id} className={css.requirementRow}>
                  <div>
                    <strong>{d.title}</strong>
                    <p>
                      {t(d.severity)} · {t(d.status)} · {d.evidence}
                    </p>
                  </div>
                  <div className={css.rowActions}>
                    <Button
                      size="sm"
                      disabled={!actor.roles.includes('developer') || d.status !== 'open'}
                      onClick={() => {
                        open('fixDefect', [{ key: 'commit', labelKey: 'commit' }, evidence], values => ({
                          type: 'defect.fix',
                          defectId: d.id,
                          commit: values.commit ?? '',
                          evidence: values.evidence ?? '',
                        }))
                      }}
                    >
                      {t('fixDefect')}
                    </Button>
                    <Button
                      size="sm"
                      disabled={
                        !actor.roles.includes('tester') ||
                        d.status !== 'fixed' ||
                        submission.status !== 'testing' ||
                        d.submissionId === submission.id
                      }
                      onClick={() => {
                        open('verifyDefect', [result, evidence], values => ({
                          type: 'defect.verify',
                          defectId: d.id,
                          submissionId: submission.id,
                          passed: values.result === 'passed',
                          evidence: values.evidence ?? '',
                        }))
                      }}
                    >
                      {t('verifyDefect')}
                    </Button>
                  </div>
                </div>
              ))}
              <details>
                <summary>{t('submissionHistory')}</summary>
                {project.submissions
                  .filter(s => s.versionId === version?.id)
                  .map(s => (
                    <p key={s.id}>
                      {s.createdAt} · {s.commit.slice(0, 12)} · {s.artifact} · {t(s.status)} ·{' '}
                      {s.cases.filter(c => c.result === 'passed').length}/{s.cases.length}
                    </p>
                  ))}
              </details>
            </>
          )}
        </section>
      )}
      {stage >= 4 && version && (
        <section className={css.business}>
          <div className={css.rowActions}>
            <Button
              onClick={() => {
                open(
                  'releaseRecord',
                  [
                    {
                      key: 'kind',
                      labelKey: 'releaseKind',
                      choices: ['gray', 'full', 'verify', 'rollback', 'hotfix'].map(value => ({
                        value,
                        label: t(value as RdKey),
                      })),
                    },
                    { key: 'environment', labelKey: 'environment' },
                    evidence,
                  ],
                  values => ({
                    type: 'release.record',
                    versionId: version.id,
                    kind: values.kind as 'gray' | 'full' | 'verify' | 'rollback' | 'hotfix',
                    environment: values.environment ?? '',
                    evidence: values.evidence ?? '',
                  }),
                )
              }}
            >
              {t('releaseRecord')}
            </Button>
            <Button
              disabled={!actor.roles.includes('product')}
              onClick={() => {
                open(
                  'closeVersion',
                  [
                    { key: 'retrospective', labelKey: 'retrospective', multiline: true },
                    { key: 'knowledge', labelKey: 'knowledge', multiline: true },
                  ],
                  values => ({
                    type: 'version.close',
                    versionId: version.id,
                    retrospective: values.retrospective ?? '',
                    knowledge: values.knowledge ?? '',
                  }),
                )
              }}
            >
              {t('closeVersion')}
            </Button>
          </div>
          <p className={css.muted}>{t('externalReleaseHint')}</p>
        </section>
      )}
      {project.changes.some(c => c.versionId === version?.id) && (
        <section className={css.business}>
          <h2>{t('change')}</h2>
          {project.changes
            .filter(c => c.versionId === version?.id)
            .map(change => (
              <div className={css.requirementRow} key={change.id}>
                <div>
                  <strong>{change.title}</strong>
                  <p>
                    {change.impact} · {t(change.status)}
                  </p>
                  <small>{change.affectedNodes.join(' → ')}</small>
                </div>
                <Button
                  disabled={!actor.roles.includes('product') || change.status !== 'pending'}
                  onClick={() => {
                    open(
                      'approveChange',
                      [
                        {
                          key: 'result',
                          labelKey: 'result',
                          choices: [
                            { value: 'approve', label: t('approve') },
                            { value: 'reject', label: t('reject') },
                          ],
                        },
                        { key: 'note', labelKey: 'note', multiline: true },
                      ],
                      values => ({
                        type: 'change.decide',
                        changeId: change.id,
                        approved: values.result === 'approve',
                        note: values.note ?? '',
                      }),
                    )
                  }}
                >
                  {t('approveChange')}
                </Button>
              </div>
            ))}
        </section>
      )}
      {actor.roles.includes('admin') && (
        <details className={css.business}>
          <summary>
            {t('members')} · {members.length}
          </summary>
          {members.map(member => (
            <p key={member.id}>
              {member.name} · {member.username} · {member.roles.join(' / ')}
            </p>
          ))}
          <Button
            onClick={() => {
              open(
                'addMember',
                [
                  { key: 'username', labelKey: 'username' },
                  { key: 'name', labelKey: 'name' },
                  { key: 'password', labelKey: 'password', secret: true },
                  { key: 'roles', labelKey: 'roles', value: 'developer' },
                ],
                values => ({
                  type: 'member.create',
                  username: values.username ?? '',
                  name: values.name ?? '',
                  password: values.password ?? '',
                  roles: (values.roles ?? '').split(',').map(value => value.trim()) as Role[],
                }),
              )
            }}
          >
            {t('addMember')}
          </Button>
        </details>
      )}
    </>
  )
}
