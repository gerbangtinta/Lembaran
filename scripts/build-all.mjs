// Discovers every reader project and builds the site in one command.
//   1. the hub builds first and owns `dist/` (it empties it)
//   2. each `Lembaran.<Format>` that declares `lembaran.slug` builds into `dist/<slug>/`
// Adding a reader needs no edit here: declare the metadata and it is included.
import { execSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SKIP = new Set(['Lembaran.App', 'Lembaran.UI']);

function projects() {
  return readdirSync(ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^Lembaran\.[A-Z]/.test(entry.name))
    .map((entry) => {
      const manifest = join(ROOT, entry.name, 'package.json');
      if (!existsSync(manifest)) return null;
      const pkg = JSON.parse(readFileSync(manifest, 'utf8'));
      return { folder: entry.name, pkg };
    })
    .filter((item) => item !== null);
}

const all = projects();
const hub = all.find((item) => item.folder === 'Lembaran.App');
const readers = all.filter(
  (item) => !SKIP.has(item.folder) && item.pkg.scripts?.build && item.pkg.lembaran?.slug,
);

if (!hub) {
  console.error('Lembaran.App is missing; there is no site without the hub.');
  process.exit(1);
}

const started = Date.now();
const DIST = join(ROOT, 'dist');
console.log(`Building the hub, then ${readers.length} reader(s).`);

/** Fails loudly when a build lands somewhere other than dist/ — a relative outDir does. */
function expect(relative, label) {
  const target = join(DIST, relative);
  if (!existsSync(target)) {
    console.error(`\n${label} did not produce ${target}.`);
    console.error('Check the project Vite config: outDir must be absolute or repo-relative, and a relative');
    console.error('outDir is resolved against the workspace folder, not the repository root.');
    process.exit(1);
  }
}

execSync(`npm run build -w ${hub.pkg.name}`, { cwd: ROOT, stdio: 'inherit' });
expect('index.html', 'The hub');

for (const reader of readers) {
  const slug = reader.pkg.lembaran.slug;
  console.log(`\n→ ${reader.folder}  (served at /${slug}/)`);
  execSync(`npm run build -w ${reader.pkg.name}`, { cwd: ROOT, stdio: 'inherit' });
  expect(join(slug, 'index.html'), reader.folder);
}

// The built site is the object code the GPL is about, so the license and the notices are served with
// it, beside the JS — not only kept in the repository.
const served = [
  ['LICENSE', 'LICENSE.txt'],
  ['NOTICE', 'NOTICE.txt'],
  ['THIRD-PARTY-NOTICES.md', 'THIRD-PARTY-NOTICES.txt'],
];
for (const [from, to] of served) {
  copyFileSync(join(ROOT, from), join(DIST, to));
  expect(to, from);
}

// The standard-font substitutes are referenced as `/fonts/*` from every reader's CSS, so one copy
// sits at the site root. Their licences travel inside the folder.
cpSync(join(ROOT, 'public', 'fonts'), join(DIST, 'fonts'), { recursive: true });
expect('fonts/manifest.json', 'The font bundle');
console.log('\n  license + notices copied to dist/, and the standard fonts to dist/fonts/');

console.log(`\nSite assembled in dist/ in ${Math.round((Date.now() - started) / 100) / 10}s:`);
console.log('  /            the hub');
for (const reader of readers) console.log(`  /${reader.pkg.lembaran.slug}/`.padEnd(14) + reader.pkg.lembaran.name);
