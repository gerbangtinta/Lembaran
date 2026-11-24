import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// The hub owns the site root. Readers build to dist/<slug>/ from their own
// workspace, so this bundle never contains a reader.
// Absolute paths: a relative outDir is resolved against the workspace folder, which
// silently wrote outside the repository once the projects moved.
export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom'] },
  build: {
    outDir: resolve(import.meta.dirname, '../dist'),
    emptyOutDir: true,
  },
});
