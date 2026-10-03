import { expect, it } from 'vitest'
import { checkOutput } from '../src/check-output.ts'
it('keeps large escaped output persistable and explicitly marks the retained tail as lossy', () => {
  const reader = { readFrom: () => ({ text: '\u0000'.repeat(1000000), nextOffset: 1000000, lossy: false }) }
  const output = checkOutput(reader)
  expect(JSON.stringify({ stdout: output, stderr: output }).length).toBeLessThan(100000)
  expect(output).toMatchObject({ lossy: true, nextOffset: 1000000 })
})
