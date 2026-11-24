import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/xlsx/',
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom'] },
  // the engine's WASM is 7.6 MB: it must be served, hashed and cached like any other asset
  assetsInclude: ['**/*.wasm'],
  // `/fonts/*` is copied to `dist/fonts` once by scripts/build-all.mjs; see Lembaran.Docs.
  publicDir: resolve(import.meta.dirname, '../public'),
  build: {
    copyPublicDir: false,
    outDir: resolve(import.meta.dirname, '../dist/xlsx'),
    emptyOutDir: true,
  },
});
