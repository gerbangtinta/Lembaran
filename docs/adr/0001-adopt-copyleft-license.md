# ADR 0001 — Adopt a copyleft license for Lembaran

- **Status:** Accepted
- **Date:** 2026-11-24
- **Decision owner:** project owner
- **Supersedes:** the Apache-2.0 declaration the repository started with

## Context

Lembaran is a local-only document reader. It has no server, no account and no telemetry; the whole
product is a `dist/` folder of static HTML, JavaScript and WASM built from this repository. Five
readers (PDF, DOCX, PPTX, XLSX, CSV) sit on permissive engines: `pdfjs-dist`, `docx-preview`,
`@betteroffice/*`, `papaparse`, `react`, `dexie`, `comlink`.

The project wants the application itself — every file in this repository, including the hub, the
readers, the framework and these docs — to carry a strong copyleft license, so a modified Lembaran
served to the public stays free software.

## Decision

Lembaran is licensed **`GPL-3.0-only`** (GNU General Public License, version 3, 29 June 2007). The
license belongs to the work as a whole; the third-party components keep their own licenses.

| Component | License | Relationship to GPLv3 |
| --- | --- | --- |
| Lembaran (this repository) | GPL-3.0-only | the work |
| `react`, `react-dom`, `papaparse` | MIT | permissive, compatible |
| `pdfjs-dist`, `dexie`, `comlink`, `docx-preview`, `@betteroffice/*` | Apache-2.0 | permissive, one-way compatible with GPLv3 (not GPLv2) |
| Font assets, when bundled | OFL-1.1 | stay under OFL; their text ships beside the font files |
| Build-only tooling (`typescript`, `vitest`, `@playwright/test`) | Apache-2.0 / MIT | not distributed |

Nothing in the tree is copyleft except Lembaran itself, so no dependency needed a relicensing
decision; this ADR discharges the "GPL needs an ADR" rule for the project's own license.

## Obligations this accepts

1. **Corresponding Source for every served build.** The JS/WASM that a browser downloads is object
   code. The source is this repository, published publicly; `NOTICE`, `THIRD-PARTY-NOTICES.md` and the
   generated `ownLicense` in `Lembaran/src/licenses/notices.ts` state that, and the generator prints the
   repository URL from `package.json.repository` as soon as one exists.
2. **Keep notices.** The copyright line, the GPL text (`LICENSE`, `LICENSES/GPL-3.0-only.txt`) and the
   permissive dependencies' notices (`LICENSES/*.txt`, `THIRD-PARTY-NOTICES.md`) travel with the work.
   `npm run build` copies them into `dist/` as `LICENSE.txt`, `NOTICE.txt` and
   `THIRD-PARTY-NOTICES.txt`, so the served artifact carries them instead of leaving them behind in the
   repository.
3. **No extra restrictions.** Distribution of a built `dist/` may not add terms the GPL forbids, and
   any modified dependency file must be marked as changed (none are modified today).
4. **OFL assets stay OFL.** Bundled fonts are not relicensed by this decision.

## Consequences

- `npm run notices` now reads the project license and the repository URL from `package.json` instead of
  a hardcoded string; a second run produces an identical file.
- `npm run licenses:check` also fails when the project's own license has no text in `LICENSES/`.
- The planned in-app attribution dialog must show the app license and the source offer, not only the
  dependency list.
- The repository URL is still missing: publishing the repository and adding `repository` to
  `package.json` completes obligation 1. Tracked in `AGENTS/PLAN.md`.
- This is a license decision, not legal advice; the copyright holder should confirm it before the first
  public release.
