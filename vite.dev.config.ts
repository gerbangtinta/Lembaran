import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// One dev server for the whole repository. `root` is absolute so this config can be
// started from any project folder (`npm run dev` inside Lembaran.App or Lembaran.Pdf
// both work). The hub is the site root in dev too: the root index.html renders it,
// exactly as `/` does in production.
const root = import.meta.dirname;

// the same number the build bakes in, so dev and production print one version
const { version } = JSON.parse(
  readFileSync(join(root, 'Lembaran.App', 'package.json'), 'utf8'),
) as { version: string };

interface ReaderRoute {
  folder: string;
  slug: string;
  name: string;
}

function readers(): ReaderRoute[] {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^Lembaran\.[A-Z]/.test(entry.name))
    .filter((entry) => entry.name !== 'Lembaran.App' && entry.name !== 'Lembaran.UI')
    .flatMap((entry) => {
      const manifest = join(root, entry.name, 'package.json');
      if (!existsSync(manifest)) return [];
      const pkg = JSON.parse(readFileSync(manifest, 'utf8').replace(/^\uFEFF/, ''));
      if (!pkg.lembaran?.slug) return [];
      return [{ folder: entry.name, slug: pkg.lembaran.slug, name: pkg.lembaran.name ?? entry.name }];
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

/** `/<slug>` redirects to the project's own entry, so a reader has a short address in dev. */
function shortLinks(known: ReaderRoute[]): Plugin {
  return {
    name: 'lembaran-short-links',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = request.url ?? '/';
        const path = url.split('?')[0] ?? '/';
        const slug = path.replace(/^\/+|\/+$/g, '');
        const match = known.find((reader) => reader.slug === slug);
        if (!match) {
          next();
          return;
        }
        const query = url.includes('?') ? `?${url.split('?')[1]}` : '';
        response.statusCode = 302;
        response.setHeader('location', `/${match.folder}/index.html${query}`);
        response.end();
      });
    },
  };
}

function urls(known: ReaderRoute[]): Plugin {
  return {
    name: 'lembaran-urls',
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        setTimeout(() => {
          const origin = (server.resolvedUrls?.local?.[0] ?? 'http://localhost:5173/').replace(/\/$/, '');
          console.log('\n  Lembaran - open one of these:');
          console.log(`    ${origin}/`.padEnd(34) + 'the hub');
          for (const reader of known) {
            console.log(`    ${origin}/${reader.slug}/`.padEnd(34) + reader.name);
          }
          console.log('');
        }, 0);
      });
    },
  };
}

export default defineConfig(() => {
  const known = readers();
  return {
    root,
    define: { __APP_VERSION__: JSON.stringify(version) },
    plugins: [react(), shortLinks(known), urls(known)],
    resolve: { dedupe: ['react', 'react-dom'] },
    // Pre-bundled once, so a page load does not trigger a re-optimize (which reloads everything).
    optimizeDeps: { include: ['react', 'react-dom', 'react-dom/client'] },
    server: {
      port: 5173,
      // a second `npm run dev` must fail loudly instead of quietly starting on 5174 while the
      // browser keeps talking to the first one — two servers share node_modules/.vite and corrupt
      // each other's module graph, which looks exactly like "your screen works, mine doesn't"
      strictPort: true,
      fs: { allow: [root] },
      // Windows drops native file events often enough that a stale transform survives an edit,
      // and a stale transform is indistinguishable from "no hot reload". Poll instead.
      watch: { usePolling: true, interval: 150 },
      hmr: { overlay: true },
    },
  };
});
