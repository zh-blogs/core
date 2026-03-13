import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  target: 'esnext',
  entry: {
    index: 'src/index.ts',
    client: 'src/client.ts',
    'schema/*': 'src/schema/*.ts',
    'constants/*': 'src/constants/*.ts',
    'zod/index': 'src/zod/index.ts',
  },
  dts: true,
  platform: 'node',
  format: ['esm'],
  outDir: './dist',
  sourcemap: true,
  shims: false,
})
