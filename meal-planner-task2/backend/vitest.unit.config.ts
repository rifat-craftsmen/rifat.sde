import { defineConfig } from 'vitest/config'

// Unit tests: pure logic + mocked DynamoDB. No real database needed.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/unit/**/*.test.ts'],
    pool: 'forks',
    reporters: 'default',
  },
})
