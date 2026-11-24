import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// one source of truth for the version the hub prints: this package's own manifest
const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string };

// The hub owns the site root. Readers build to dist/<slug>/ from their own
// workspace, so this bundle never contains a reader.
// Absolute paths: a relative outDir is resolved against the workspace folder, which
// silently wrote outside the repository once the projects moved.
export default defineConfig({
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom'] },
  define: { __APP_VERSION__: JSON.stringify(version) },
  // Site-root assets live in the repository's `public/`: `_headers` (COOP/COEP/CSP) and `/fonts`.
  // The hub builds into the site root, so it is the one project that copies them into `dist/`.
  publicDir: resolve(import.meta.dirname, '../public'),
  build: {
    outDir: resolve(import.meta.dirname, '../dist'),
    emptyOutDir: true,
  },
});
