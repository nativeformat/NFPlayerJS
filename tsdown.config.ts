import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
  },
  format: ['esm', 'cjs'],
  // Point at the leaf project tsconfig (the root tsconfig is a solution file with `references`).
  tsconfig: 'package.tsconfig.json',
  dts: true,
  sourcemap: true,
  clean: true,
  // Lib is browser/Node-agnostic; CLI uses node: built-ins which stay external.
  platform: 'neutral',
  target: 'es2022',
  outDir: 'dist',
});
