import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html',
        debug: './debug.html',
      },
    },
  },
  server: {
    // The wav fixture under <repo>/fixtures is shared with package tests.
    fs: { allow: ['..'] },
  },
  plugins: [react()],
});
