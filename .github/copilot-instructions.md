# Lembaran — permanent conventions

These are standing rules for this repository. They apply to every change unless the user says
otherwise in the same request.

The working rules — confirm before implementing, two changelogs, keep the dev notes true, license
integrity — are in [`AGENTS/skills/lembaran/SKILL.md`](../AGENTS/skills/lembaran/SKILL.md). Read it
before you change anything.

## Web only, and that is not negotiable

Every target is the same static `dist/` served over HTTPS. Desktop and mobile are browsers. There is no
Tauri, no Electron, no Capacitor, no React Native, and no build target other than the web. The only
install path is the PWA's *Add to Home Screen*, which is manifest lines, not a project.

Consequence: capability differences are handled by **feature detection and fallback**, never by
platform branches at build time. No File System Access API on iOS? `<input type=file>` plus an OPFS
copy. No `SharedArrayBuffer`? single-threaded WASM. A reader never asks which browser it is on.

## Each format owns its logic and its GUI, as vertical slices

`Lembaran.<Format>` is laid out like Sanggar.Editor:

- `src/feature/<name>/` — one capability, self-contained: `index.ts` (public surface), `store.ts`,
  `actions.ts`, `selectors.ts`, test beside it. PDF: `open`, `paginate`, `zoom`, `search`. PPTX:
  `slides`, `notes`. XLSX: `sheets`. CSV: `grid`.
- `src/presentations/` — every pixel: `layout/` (shells + `viewport/` for the canvas), `component/`,
  `library/` (primitives with no product knowledge), `ui/` (toolbars, dialogs), `mobile/` (the phone's
  own shell and stylesheet).
- `src/state/`, `src/storage/`, `src/App.tsx` (picks the shell), `src/adapter.ts` (thin, mounts it).

`Lembaran` is primitives only: `adapter/`, `files/`, `opfs/`, `handles/`, `licenses/`. **No React, no CSS,
no component** — the reusable GUI layer is `Lembaran.UI` (theme tokens, `ThemeProvider`,
`useIsDesktop` / `useIsMobile` / `useIsFullscreen`, the general components), and a viewer toolbar, page
control, slide strip, sheet tab bar or grid belongs in the reader's own `presentations/`.

Two rules keep it honest: another feature imports `feature/<name>/index.ts`, never its internals; and a
phone gets its own shell in its own files — a separate `.tsx`, a separate stylesheet, never a
responsive branch or a phone `@media` block inside a desktop file. Only `App.tsx` picks, by rendering
one shell or the other.

The formats are allowed to look and behave nothing alike. That is the point of them being separate
projects. Do not unify them for tidiness. Full rules:
[`AGENTS/skills/lembaran/references/slices.md`](../AGENTS/skills/lembaran/references/slices.md).

## The hub is a launcher and the dev surface

`Lembaran.App` shows a format selector and **iframes** the chosen reader in development and in production
alike, so the path that ships is the path that is tested. One `npm run dev` at the repository root serves
the hub at `/` and every reader at `/<slug>/`; the hub imports no reader in either mode.

A production hub bundle that references a format adapter is a defect, checked in CI. The hub budget is
≤ 120 KB gzip.

## The worker boundary

Every engine runs in a worker behind the `ReaderAdapter` contract, reached over Comlink. Bytes are
`Transferable`, never copied. The main thread composes the UI; it never parses, lays out or renders a
document. An engine handle is disposed explicitly; a leaked handle is a bug.

## Nothing leaves the browser

Local-only is a product promise, not a preference. Self-host every asset: fonts, CMaps, WASM,
standard font data. Engine defaults that fetch from a CDN are overridden at configuration time, and CSP
`connect-src 'self'` makes an accidental call fail loudly. The e2e suite asserts zero external network
requests per reader.

## Weight is published, not estimated

`FRAMEWORK.md` holds the measured raw and gzip payload of every engine. Sizes are measured from the
published tarballs. A dependency bump updates the version **and** re-measures the size in the same
commit. First-load budgets are enforced in CI against the build report.

## Licenses: record, place, disclose

- Permissive (MIT, BSD, Apache-2.0): keep the notice, add a row to `FRAMEWORK.md` and a section to
  `THIRD-PARTY-NOTICES.md`.
- Weak copyleft (MPL-2.0, LGPL): as above, plus record which files were modified.
- Strong copyleft (GPL, AGPL): requires an ADR **before** merging, plus whole-work disclosure. The AGPL
  network clause reaches anything served from the origin.
- No binary-only dependency, whatever its npm `license` field says. `pptx-preview` was rejected for
  exactly this.
- Anything whose license requires a text to accompany the artifact gets that text copied next to the
  artifact — `LICENSES/*.txt` at the root, and for a bundled font its OFL text beside the font files.
  A license that exists only in `node_modules` has not been disclosed.

## Tracking files are part of the deliverable

`AGENTS/PLAN.md` by version, `AGENTS/CHANGELOG.md` by version for the user, `AGENTS/CHANGELOG-DEV.md`
by date for the code, `AGENTS/DEVNOTES.md` for what is true now, `AGENTS/LIMITATION.md` for what is
missing. A change that touches none of them has not shipped. `AGENTS/LARGEFILES.md` is generated by
`npm run large-files` and fails the gate when stale.
