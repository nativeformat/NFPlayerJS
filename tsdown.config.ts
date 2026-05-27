import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
  },
  format: ['esm', 'cjs'],
  tsconfig: 'package.tsconfig.json',
  dts: true,
  sourcemap: true,
  clean: true,
  platform: 'neutral',
  target: 'es2022',
  outDir: 'dist',
});
