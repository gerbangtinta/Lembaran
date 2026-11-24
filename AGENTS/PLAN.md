# Lembaran build plan

The masterplan, by version. A version is a release; inside it a section is a rule about the app,
written in the present tense, and the checkboxes are the work that makes the rule true. The open
version comes first, so "what is next" is the first heading; a shipped version stays below it as the
record, with its checked boxes and its struck-through audit trail intact.

| Version | State | Sections |
| --- | --- | --- |
| `0.1.0-alpha` — 2026-11-24 | open | A · B · C · D1–D5 (read-only readers, in order) |

A version closes when its boxes are ticked; a new one opens only when the user names it, and the
heading date is the day it was named. Order matters where noted. **One format at a time**: a chunk is
finished, tested and green before the next begins.

**Out of scope for `0.1.0-alpha`, and not to be re-litigated mid-milestone:** any editing or saving,
annotations, sync, accounts, OCR, encrypted PDFs, forms, and every native shell (Tauri, Electron,
Capacitor). This is a read-only web reader.

# 0.1.0-alpha — open, named 2026-11-24

Product rule: **a document is read locally, in the browser, with nothing leaving the machine.** The
shell composes, the worker parses, the engine paints.

## A. Foundation

Rule: the repository builds, lints, type-checks, and enforces its own license and size records before
any reader exists.

- [x] npm workspaces (no task runner); `Lembaran`, `Lembaran.App`, `Lembaran.Pdf` — one folder per
      reader, Sanggar-style, each with its own `package.json`.
- [x] `AGENTS/` scaffold, root `AGENTS.md`, `.github/copilot-instructions.md`; three skills under
      `AGENTS/skills/` (`lembaran`, `license-compliance`, `planning-annotations`).
- [x] `LICENSES/*.txt`, `NOTICE`, `LICENSE` (GPL-3.0-only for the app; dependencies stay permissive),
      `AGENTS/FRAMEWORK.md`, generated `THIRD-PARTY-NOTICES.md`, and `LICENSE.txt`/`NOTICE.txt`/
      `THIRD-PARTY-NOTICES.txt` copied into `dist/` by the build so the served site carries them.
- [ ] In-app attribution dialog, generated from the same manifest, including the source offer.
- [ ] Publish the repository and put its URL in `package.json` `repository`, so the generated notices
      carry the Corresponding Source link the GPL requires.
- [x] `npm run licenses:check` fails on an unrecorded dependency, a missing license text, or a
      GPL/AGPL addition with no ADR. `npm run large-files:check` fails on a stale `LARGEFILES.md`.
- [ ] CI: typecheck, test, licenses, large-files, build, and the hub-bundle adapter assertion. (Run by hand on 2026-11-24; not yet a workflow.)

## B. Primitives (framework)

Rule: the framework supplies what every reader needs and nothing any reader draws.

- [x] `ReaderAdapter` contract + `ReaderContext`, and the source types a reader receives.
- [ ] Comlink worker RPC layer with transferable bytes. pdf.js runs its own worker today, so the seam
      exists before it is needed.
- [x] File System Access open/save-as; `FileSystemFileHandle` persisted in IndexedDB (Dexie) with
      permission re-prompt on gesture; `<input type=file>` fallback by feature detection.
- [x] OPFS source store: `lembaran/sources/<sha256>.bin`, written on ingest and read by the reader.
- [ ] Worker-backed OPFS writes (`createSyncAccessHandle`), thumbnails, text index.
- [x] Theme tokens and the phone hook live in `Lembaran.UI`. `Lembaran` ships no React, no CSS, no
      component — it is the platform layer only.
- [ ] Error boundary and progress events.
- [x] `_headers` with COOP/COEP for the static host.
- [ ] Workbox service worker, precache manifest, install prompt, update flow, and a single-threaded
      fallback when `SharedArrayBuffer` is unavailable.

## C. The hub is the dev surface

Rule: one server runs everything in development; the production hub imports no reader.

- [x] Format selector in `Lembaran.App`.
- [x] One dev server: Vite at the repo root serves `Lembaran.App/index.html` and every
      `Lembaran.*/index.html`; the hub **iframes** the reader in both dev and production, so the path
      that ships is the path that is tested.
- [ ] CI asserts the production hub bundle contains zero format-adapter references; hub ≤ 120 KB gzip.
- [x] OPFS handoff by iframe query (`?path=…&name=…`) rather than a postMessage handshake: one channel, no ordering to get wrong.

## D. Readers — one chunk at a time, in this order

Rule: each reader owns its logic and its GUI, runs its engine in a worker, and makes no external
request. Its own Playwright spec is part of the chunk, not a later task.

### D1. PDF
- [ ] `pdfjs-dist` adapter: continuous scroll, text layer, search, zoom, outlines.
- [ ] Self-hosted CMaps and standard font data; no CDN.
- [ ] Measured first load ≤ 0.50 MB gzip engine + ≤ 350 KB shell. Spec: open, page, search, zoom.

### D1b. Reader chrome — what makes it feel finished
- [x] Toolbar: grouped icon controls, page box, zoom readout, fit, annotate with four colours, find,
      theme, full screen. Tooltips and accessible names on every control.
- [x] Full screen on the reader root, with a slim translucent bar instead of the toolbar.
- [x] Page rail: thumbnails rendered lazily, current page marked, a dot where a page has notes.
- [x] Annotations: drag a rectangle, attach a note, four colours, delete. Normalised to the page box and
      stored in IndexedDB by content hash — the PDF itself is never modified.
- [x] Keyboard: `←` `→` `PageUp` `PageDown` pages, `+` `−` zoom, `0` fit, `H` highlight, `F` full screen,
      `Ctrl+F` find, `Esc` closes overlays. Ignored while typing in a field.
- [x] Status bar: page, zoom, note count, shortcut hint.
- [ ] Annotation list panel (jump between notes from a list, not only by scrolling).
- [ ] Export annotations as JSON/Markdown.

### D1c. One build, one site
- [x] `npm run build` builds the hub then every `Lembaran.<Format>` with a `lembaran` block.
- [x] The hub's reader registry is generated from the projects on disk; `readers:check` fails when stale.
- [ ] CI runs `gates` (typecheck, test, licenses, large-files, readers, build).

### D2. DOCX — shipped on the fallback engine
- [x] **Gate before writing the adapter:** the read-only payload question is answered — `@betteroffice/docx`
      keeps its layout in the editor module, so a reader would ship the 23.85 MB editing WASM it must never
      fetch. Gate failed; escalated as the plan allowed.
- [x] `docx-preview` (Apache-2.0) adapter: real pages, zoom, page navigation, find with highlights,
      full screen, keyboard, phone shell. Own GUI. Fixture: `samples/hello.docx`, regenerated by
      `scripts/make-sample-docx.mjs`.
- [x] Measured: 148.8 KB gzip reader, 2 pages laid out, zero external requests (46 resources).
- [ ] 20 real-world files still to be run through it; the fixture proves the pipeline, not the corpus.

### D3. PPTX
- [x] `@betteroffice/pptx` adapter: slide canvas, lazy thumbnail rail, keyboard navigation, zoom, full
      screen, phone shell. Own GUI.
- [x] Measured: 117.4 KB gzip reader + 43.7 KB gzip worker + 2.34 MB gzip self-hosted WASM; zero external
      requests; fixture `samples/hello.pptx`.
- [ ] Speaker notes are in the snapshot (`slide.notes`) but nothing shows them yet.
- [ ] Search inside a deck (`findText`) and hiding hidden slides.

### D4. XLSX
- [ ] `@betteroffice/xlsx` adapter: sheet tabs, viewport paint, formula values. Own GUI.

### D5. CSV
- [x] `papaparse` + own virtualized grid: delimiter sniffing, streaming for large files. Own GUI.
- [x] Hold a note on whether the XLSX engine's grid could replace the custom one; measure before deciding.
      Answered: no — `@betteroffice/xlsx` costs 2.84 MB gzip to draw text that papaparse + 40 lines of
      range arithmetic renders from 7 KB.

## E. Assembly

- [ ] Production hub: launcher grid, iframe host, drag-drop routing, `share_target`.
- [ ] Cross-app e2e: every reader, hub embed, offline reload, mobile viewports, zero external requests.
- [ ] ADR-001 TypeScript over C#; ADR-002 engine choice (with the LibreOffice/OnlyOffice rejection
      evidence); ADR-003 dev-hub selector.

## F. Deferred, named so nobody re-opens it

- Editing and saving (milestone 2). The adapter contract reserves the door; nothing else is built for it.
- Native shells. Rejected: web only, by the user's decision.
- Sync, accounts, collaboration. Out of scope for a local-only reader.
