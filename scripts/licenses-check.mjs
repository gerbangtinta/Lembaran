// Fails when a dependency is not recorded, its license text is missing, or copyleft
// arrived without a decision. Runs as `npm run licenses:check`.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const FRAMEWORK = readFileSync(join(ROOT, 'AGENTS', 'FRAMEWORK.md'), 'utf8');
const LICENSES_DIR = join(ROOT, 'LICENSES');
const ADR_DIR = join(ROOT, 'docs', 'adr');

/** Discovered from disk so a new `Lembaran.<Format>` project is audited the day it is created. */
function workspaces() {
  return readdirSync(ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^Lembaran(\.|$)/.test(entry.name))
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(ROOT, name, 'package.json')))
    .sort();
}

const SKIP = new Set(
  workspaces().map(
    (folder) => JSON.parse(readFileSync(join(ROOT, folder, 'package.json'), 'utf8').replace(/^\uFEFF/, '')).name,
  ),
);

function declaredDependencies() {
  const names = new Set();
  const manifests = [join(ROOT, 'package.json'), ...workspaces().map((w) => join(ROOT, w, 'package.json'))];
  for (const manifest of manifests) {
    if (!existsSync(manifest)) continue;
    const pkg = JSON.parse(readFileSync(manifest, 'utf8').replace(/^\uFEFF/, ''));
    for (const field of ['dependencies', 'peerDependencies']) {
      for (const [name, range] of Object.entries(pkg[field] ?? {})) {
        if (!SKIP.has(name) && !String(range).startsWith('file:')) names.add(name);
      }
    }
  }
  return [...names].sort();
}

function licenseOf(name) {
  const manifest = join(ROOT, 'node_modules', name, 'package.json');
  if (!existsSync(manifest)) return null;
  const pkg = JSON.parse(readFileSync(manifest, 'utf8').replace(/^\uFEFF/, ''));
  const value = typeof pkg.license === 'string' ? pkg.license : pkg.license?.type;
  return value ?? null;
}

function idsIn(expression) {
  const ids = new Set();
  for (const token of expression.replace(/[()]/g, ' ').split(/\s+/)) {
    if (['AND', 'OR', 'WITH', ''].includes(token)) continue;
    ids.add(token);
  }
  return [...ids];
}

const failures = [];
const dependencies = declaredDependencies();

for (const name of dependencies) {
  if (!FRAMEWORK.includes(`\`${name}\``)) {
    failures.push(`${name}: no row in AGENTS/FRAMEWORK.md`);
  }

  const license = licenseOf(name);
  if (license === null) {
    failures.push(`${name}: license cannot be determined from the installed package`);
    continue;
  }

  for (const id of idsIn(license)) {
    if (!existsSync(join(LICENSES_DIR, `${id}.txt`))) {
      failures.push(`${name}: LICENSES/${id}.txt is missing (declared ${license})`);
    }
  }

  if (/AGPL|GPL/.test(license)) {
    const adrs = existsSync(ADR_DIR) ? readdirSync(ADR_DIR).join(' ') : '';
    if (!adrs.includes('copyleft')) {
      failures.push(`${name}: ${license} needs an ADR in docs/adr before merge`);
    }
  }
}

if (failures.length > 0) {
  console.error(`licenses:check failed (${failures.length})`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`licenses:check passed for ${dependencies.length} dependencies`);
