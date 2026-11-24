import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { cp } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);

function pdfjsDistDir(): string {
  try {
    return dirname(require.resolve('pdfjs-dist/package.json'));
  } catch {
    return resolve(dirname(require.resolve('pdfjs-dist')), '..');
  }
}

// pdf.js fetches standard fonts and CMaps at runtime. They must be served from
// our own origin: a CDN fetch would break the local-only promise.
function pdfjsAssets(): Plugin {
  return {
    name: 'lembaran-pdfjs-assets',
    async closeBundle() {
      const pkg = pdfjsDistDir();
      const out = resolve(import.meta.dirname, '../dist/pdf/pdfjs');
      await cp(resolve(pkg, 'standard_fonts'), resolve(out, 'standard_fonts'), { recursive: true });
      await cp(resolve(pkg, 'cmaps'), resolve(out, 'cmaps'), { recursive: true });
    },
  };
}

export default defineConfig({
  base: '/pdf/',
  plugins: [react(), pdfjsAssets()],
  resolve: { dedupe: ['react', 'react-dom'] },
  build: {
    // absolute: a relative outDir resolves against the workspace folder
    outDir: resolve(import.meta.dirname, '../dist/pdf'),
    emptyOutDir: true,
  },
});
