import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/pptx/',
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom'] },
  // the engine's 6 MB WASM must be served, hashed and cached like any other asset
  assetsInclude: ['**/*.wasm'],
  build: {
    outDir: resolve(import.meta.dirname, '../dist/pptx'),
    emptyOutDir: true,
  },
});
