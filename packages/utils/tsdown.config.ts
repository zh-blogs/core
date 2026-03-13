import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  target: 'esnext',
  entry: {
    'psl/index': 'src/psl/index.ts',
  },
  dts: true,
  platform: 'node',
  format: ['esm'],
  outDir: './dist',
  sourcemap: true,
  shims: false,
})
