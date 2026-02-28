import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts', 'tests/unit/**/*.test.ts'],
    environment: 'node',
  },
})
