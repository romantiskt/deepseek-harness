import { randomUUID } from 'node:crypto'
import { WorkflowRepository } from '../src/repository.ts'
import type { WorkflowCommand } from '../../contracts/src/commands.ts'
import type { WorkflowScope } from '../../contracts/src/types.ts'
export function fixture() {
  const repo = new WorkflowRepository(':memory:')
  const actor = repo.authenticate(repo.bootstrap('admin', 'Owner', 'local-test-12345', 'Test project').token)
  const state = () => repo.snapshot(actor).project
  const send = (payload: WorkflowCommand, scope: Partial<WorkflowScope> = {}) =>
    repo.dispatch(
      {
        commandId: randomUUID(),
        expectedRevision: state().revision,
        scope: { projectId: actor.member.projectId, ...scope },
        payload,
      },
      actor,
    )
  const requirement = () =>
    send({
      type: 'requirement.create',
      title: 'Playback speed',
      content: 'Remember the speed',
      acceptance: 'Restores after restart',
      priority: 'P1',
      ownerId: actor.member.id,
    }).entityId
  const version = () =>
    send({ type: 'version.create', title: '1.0', targetDate: '', ownerId: actor.member.id }).entityId
  const evidence = (versionId: ReturnType<typeof version>) =>
    send(
      {
        type: 'artifact.createRevision',
        title: 'Test evidence',
        text: 'Reviewed implementation details',
        kind: 'document',
      },
      { versionId },
    ).entityId
  const approve = (versionId: ReturnType<typeof version>) => {
    const artifactId = evidence(versionId)
    for (const nodeId of ['05', '06'])
      send({ type: 'node.recordOutcome', versionId, nodeId, note: 'Complete', artifactIds: [artifactId] })
    for (const nodeId of ['07', '08', '09', '10'])
      send({ type: 'review.decide', versionId, nodeId, outcome: 'passed', note: 'Reviewed', artifactIds: [artifactId] })
  }
  return { repo, actor, state, send, requirement, version, evidence, approve }
}
