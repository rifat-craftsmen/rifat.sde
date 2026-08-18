import { defineConfig } from 'vitest/config'

// E2E tests: real Express app + real DynamoDB Local on :8000.
// globalSetup provisions/tears down the table; setupFiles loads env + the Ed25519 keypair
// BEFORE the app is imported (dynamoClient reads process.env at import time).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/e2e/**/*.e2e.test.ts'],
    setupFiles: ['./test/e2e/setup/env.ts'],
    globalSetup: ['./test/e2e/setup/globalSetup.ts'],
    pool: 'forks',
    // E2E touches the real network + DB; keep it serial and give it room.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
    reporters: 'default',
  },
})
