import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const currentDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: currentDir,
  resolve: {
    alias: {
      '@zhblogs/utils/psl': resolve(currentDir, '../utils/src/psl/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
