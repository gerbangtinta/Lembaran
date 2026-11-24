import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/docs/',
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom'] },
  // `/fonts/*` is a site-root asset: `scripts/build-all.mjs` copies `public/fonts` to `dist/fonts`
  // once. Pointing publicDir at it lets the CSS `url('/fonts/…')` resolve instead of warning, and
  // `copyPublicDir: false` stops Vite from copying 8.2 MB of faces into every reader's folder.
  publicDir: resolve(import.meta.dirname, '../public'),
  build: {
    copyPublicDir: false,
    outDir: resolve(import.meta.dirname, '../dist/docs'),
    emptyOutDir: true,
  },
});
