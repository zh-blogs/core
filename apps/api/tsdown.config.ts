import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  target: 'esnext',
  entry: ['index.ts'],
  dts: false,
  platform: 'node',
  format: ['esm'],
  outDir: './dist',
  sourcemap: true,
  shims: true,
  inlineOnly: false,
})
