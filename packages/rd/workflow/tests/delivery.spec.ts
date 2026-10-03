import { expect, it } from 'vitest'
import { fixture } from './helpers.ts'
it('blocksTestExitWithoutCasesAndBlocksUatBeforeTestExit', () => {
  const f = fixture()
  try {
    const versionId = f.version()
    expect(
      f.send({
        type: 'submission.create',
        versionId,
        commit: 'a'.repeat(40),
        artifact: 'Build 1',
        environment: 'test',
        selfTest: 'pass',
      }).errorCode,
    ).toBe('DEVELOPMENT_INCOMPLETE')
    expect(
      f.send({ type: 'release.record', versionId, evidence: 'ticket', environment: 'test', kind: 'full' }).errorCode,
    ).toBe('RELEASE_NOT_READY')
  } finally {
    f.repo.close()
  }
})
it('rejectsChangeWithoutVersionMembership', () => {
  const f = fixture()
  try {
    const versionId = f.version(),
      requirementId = f.requirement()
    expect(
      f.send({
        type: 'change.propose',
        versionId,
        requirementId,
        title: 'Change',
        content: 'New content',
        acceptance: 'New criteria',
        impact: 'Test plan',
        affectedNodes: ['08'],
      }).errorCode,
    ).toBe('NOT_ASSIGNED')
  } finally {
    f.repo.close()
  }
})
