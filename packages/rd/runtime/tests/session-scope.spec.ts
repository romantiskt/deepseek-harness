import { expect, it } from 'vitest'
import { sessionKey, parseScope } from '../src/sessions.ts'
it('binds sessions to the original requirement, baseline and task', () => {
  const scope = parseScope('{"projectId":"p","versionId":"v","requirementId":"r"}')
  expect(sessionKey(scope, 1, '')).not.toBe(
    sessionKey({ ...scope, requirementId: parseScope('{"projectId":"next"}').projectId }, 1, ''),
  )
  expect(sessionKey(scope, 1, '')).not.toBe(sessionKey(scope, 2, ''))
  expect(sessionKey(scope, 1, '')).not.toBe(sessionKey(scope, 1, 'task'))
})
