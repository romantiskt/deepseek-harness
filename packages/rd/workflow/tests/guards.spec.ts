import { randomUUID } from 'node:crypto'
import { expect, it } from 'vitest'
import { WorkflowRepository } from '../src/repository.ts'
import { workflowTemplate } from '../src/workflow-template.ts'
it('has six stages and 31 unique nodes', () => {
  expect(workflowTemplate).toHaveLength(6)
  expect(new Set(workflowTemplate.flatMap(s => s.nodes.map(n => n.id))).size).toBe(31)
})
it('denies developer requirement review and generic approval completion', () => {
  const repo = new WorkflowRepository(':memory:')
  try {
    const admin = repo.authenticate(repo.bootstrap('admin', 'Admin', 'test-password-123', 'Project').token)
    const send = (payload: Parameters<typeof repo.dispatch>[0]['payload'], actor = admin) =>
      repo.dispatch(
        {
          commandId: randomUUID(),
          scope: { projectId: admin.member.projectId },
          expectedRevision: repo.snapshot(admin).project.revision,
          payload,
        },
        actor,
      )
    send({
      type: 'member.create',
      username: 'developer',
      name: 'Developer',
      password: 'dev-password-123',
      roles: ['developer'],
    })
    const dev = repo.authenticate(repo.login('developer', 'dev-password-123').token)
    const v = send({ type: 'version.create', title: '1.0', targetDate: '', ownerId: admin.member.id }).entityId
    expect(
      send({ type: 'node.recordOutcome', versionId: v, nodeId: '07', note: 'bypass', artifactIds: [v] }).errorCode,
    ).toBe('SPECIAL_ACTION_REQUIRED')
    expect(send({ type: 'version.freeze', versionId: v }, dev).errorCode).toBe('FORBIDDEN')
    expect(send({ type: 'version.freeze', versionId: v }).errorCode).toBe('REVIEW_INCOMPLETE')
  } finally {
    repo.close()
  }
})
