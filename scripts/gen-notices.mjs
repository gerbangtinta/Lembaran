// Generates THIRD-PARTY-NOTICES.md and the in-app notice list from what is
// actually installed. Attribution lines are read from each package, never guessed.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OWN = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8').replace(/^\uFEFF/, ''));
const OWN_LICENSE = OWN.license ?? 'UNKNOWN';
/** The public repository, once `package.json` names one: a served GPL build must offer its source. */
const OWN_SOURCE = String(OWN.repository?.url ?? OWN.repository ?? OWN.homepage ?? '')
  .replace(/^git\+/, '')
  .replace(/\.git$/, '');

/** Every `Lembaran*` folder that has a package.json is a workspace; nothing to keep in sync by hand. */
function workspaceFolders() {
  return readdirSync(ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^Lembaran(\.|$)/.test(entry.name))
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(ROOT, name, 'package.json')))
    .sort();
}

const LOCAL = new Set(
  workspaceFolders().map(
    (folder) => JSON.parse(readFileSync(join(ROOT, folder, 'package.json'), 'utf8').replace(/^\uFEFF/, '')).name,
  ),
);

function dependencies() {
  const names = new Set();
  for (const manifest of [join(ROOT, 'package.json'), ...workspaceFolders().map((w) => join(ROOT, w, 'package.json'))]) {
    if (!existsSync(manifest)) continue;
    const pkg = JSON.parse(readFileSync(manifest, 'utf8').replace(/^\uFEFF/, ''));
    for (const field of ['dependencies', 'peerDependencies']) {
      for (const [name, range] of Object.entries(pkg[field] ?? {})) {
        if (!LOCAL.has(name) && !String(range).startsWith('file:')) names.add(name);
      }
    }
  }
  return [...names].sort();
}

function licenseId(pkg) {
  const value = typeof pkg.license === 'string' ? pkg.license : pkg.license?.type;
  return value ?? 'UNKNOWN';
}

function attribution(dir) {
  const candidates = readdirSync(dir)
    .filter((name) => /^(LICENSE|LICENCE|COPYING|NOTICE)/i.test(name))
    // `LICENSES/` and friends are folders in some packages; only files carry a copyright line
    .filter((name) => statSync(join(dir, name)).isFile());
  const lines = new Set();
  for (const candidate of candidates) {
    const text = readFileSync(join(dir, candidate), 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim().replace(/\s+/g, ' ');
      const isCopyright =
        /\bcopyright\b/i.test(trimmed) &&
        /\b(19|20)\d{2}\b/.test(trimmed) &&
        trimmed.length < 160 &&
        !/shall mean|licensor|distribute|copyright notice that|name of copyright owner/i.test(trimmed);
      if (isCopyright) lines.add(trimmed);
    }
  }
  return [...lines].slice(0, 3);
}

function repositoryOf(pkg) {
  if (typeof pkg.repository === 'string') return pkg.repository;
  return pkg.repository?.url ?? '';
}

const groups = new Map();
const appNotices = [];

/** Vendored fonts are not npm dependencies; the manifest is their disclosure record. */
const FONTS_MANIFEST = join(ROOT, 'public', 'fonts', 'manifest.json');
const fontFamilies = existsSync(FONTS_MANIFEST)
  ? JSON.parse(readFileSync(FONTS_MANIFEST, 'utf8')).families ?? []
  : [];

for (const name of dependencies()) {
  const dir = join(ROOT, 'node_modules', name);
  if (!existsSync(dir)) continue;
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8').replace(/^\uFEFF/, ''));
  const license = licenseId(pkg);
  const entry = { name, version: pkg.version ?? '?', license, attribution: attribution(dir) };

  if (!groups.has(license)) groups.set(license, []);
  groups.get(license).push(entry);
  appNotices.push({
    name,
    version: entry.version,
    license,
    url: repositoryOf(pkg).replace(/^git\+/, '').replace(/\.git$/, ''),
  });
}

const sections = [...groups.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([license, entries]) => {
    const rows = entries
      .map((entry) => {
        const lines = entry.attribution.map((line) => `  ${line}`).join('\n');
        return `### ${entry.name} ${entry.version}\n${lines || '  (no copyright line found in the package)'}\n  Full text: \`LICENSES/${license}.txt\``;
      })
      .join('\n\n');
    return `## ${license}\n\n${rows}`;
  })
  .join('\n\n');

const fontSection = fontFamilies.length === 0
  ? ''
  : `## Fonts (vendored, served from \`/fonts\`)\n\n${fontFamilies
      .map(
        (family) =>
          `### ${family.family} ${family.version} — ${family.license} — replaces ${family.replaces.join(', ')}\n  ${family.copyright}\n  Files: ${family.faces.map((face) => face.file).join(', ')}\n  Licence text: \`LICENSES/${family.licenseText.split('/').pop()}\` and \`/fonts/${family.licenseText}\`\n  Source: ${family.source}`,
      )
      .join('\n\n')}\n`;

for (const family of fontFamilies) {
  appNotices.push({
    name: `${family.family} (${family.replaces.join(', ')} substitute)`,
    version: family.version,
    license: family.license,
    url: family.source,
  });
}

const sourceLine = OWN_SOURCE
  ? `Corresponding Source: ${OWN_SOURCE}`
  : 'Corresponding Source: the public repository this build was produced from.';

const notices = `# Third-party notices

Lembaran itself is ${OWN_LICENSE} — see \`LICENSE\`. The full text of every license in the tree is in
\`LICENSES/\`. Versions, measured payload sizes and the reason each dependency was chosen are in
\`AGENTS/FRAMEWORK.md\`. ${sourceLine}

Generated by \`npm run notices\`. Do not edit by hand.

${sections}

${fontSection}`;

writeFileSync(join(ROOT, 'THIRD-PARTY-NOTICES.md'), notices);

const quotes = (value) => `'${String(value).replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
const list = appNotices
  .map(
    (entry) =>
      `  { name: ${quotes(entry.name)}, version: ${quotes(entry.version)}, license: ${quotes(entry.license)}, url: ${quotes(entry.url)} },`,
  )
  .join('\n');

const module = `// Generated by scripts/gen-notices.mjs. Do not edit by hand.
export interface NoticeEntry {
  name: string;
  version: string;
  license: string;
  url: string;
}

export const notices: NoticeEntry[] = [
${list}
];

export const ownLicense = { name: 'Lembaran', version: '${OWN.version}', license: '${OWN_LICENSE}', source: ${OWN_SOURCE ? `'${OWN_SOURCE}'` : 'null'} };
`;

writeFileSync(join(ROOT, 'Lembaran/src/licenses/notices.ts'), module);
console.log(`wrote notices for ${appNotices.length} dependencies`);
