import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/csv/',
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom'] },
  // `/fonts/*` is copied to `dist/fonts` once by scripts/build-all.mjs; see Lembaran.Docs.
  publicDir: resolve(import.meta.dirname, '../public'),
  build: {
    copyPublicDir: false,
    outDir: resolve(import.meta.dirname, '../dist/csv'),
    emptyOutDir: true,
  },
});
