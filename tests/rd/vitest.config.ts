/** Built-workbench keyless integration tests; run after build:rd. */
import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { include: ['tests/rd/*.e2e.spec.ts'], testTimeout: 120000, maxWorkers: 1 } })
