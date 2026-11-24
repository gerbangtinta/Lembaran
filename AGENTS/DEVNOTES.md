# Dev notes

What is true now. Read this before touching the app; update the sections a change touches, in the same
edit. When the user says **summarize**, refresh this file and answer with build, architecture,
limitations and bugs.

## Build

All commands work today, from the repository root, with npm (no pnpm, no Turborepo):

```powershell
npm install
npm run dev            # one Vite server: /Lembaran.App/index.html and /Lembaran.Pdf/index.html
npm run build          # scripts/build-all.mjs — hub first, then every reader with a `lembaran` block
npm run typecheck      # every workspace
npm test               # vitest, per workspace
npm run licenses:check # records, texts, copyleft gate
npm run readers        # regenerate the hub's reader registry from the projects on disk
npm run large-files    # regenerate AGENTS/LARGEFILES.md; :check fails when stale
npm run notices        # regenerate THIRD-PARTY-NOTICES.md and the in-app list
npm run gates          # all of the above
```

Measured 2026-11-24 from `npm run build`: hub **99.7 kB gzip** (budget 120), PDF reader
**234.3 kB gzip** plus a 372 kB gzip pdf.js worker, CSV reader **106.7 kB gzip**, Word reader
**148.8 kB gzip**, PowerPoint reader **117.4 kB gzip + 43.7 kB worker + 2.34 MB WASM**, in **5.6 s**
for the whole site (11.6 MB in `dist/`).

A new reader is added by creating `Lembaran.<Format>` with a `lembaran` block in its package.json
(`id`, `slug`, `name`, `blurb`, `extensions`, `mimeTypes`). The build and the hub's registry both pick it
up from there — nothing else to register.

### Run it

`npm run dev` works from the repository root **and** from `Lembaran.App` or `Lembaran.Pdf`: every one of
those scripts starts the same config, whose `root` is absolute, so the whole repository is served.

```
http://localhost:5173/       the hub — the site root, in dev as in production
http://localhost:5173/pdf/   the PDF reader (302 → /Lembaran.Pdf/index.html)
```

The root `index.html` is a development entry only; it renders the hub so `/` is the same address it has in
production. A reader also has a short link in dev — `/<slug>/` redirects to its project folder — because
Vite still serves the real paths underneath.

Starting a plain `vite` inside one project serves only that folder, and the hub's iframe will report
"this reader did not start" — that is the signal you are on the wrong server, not a reader bug.

## Architecture

| Project | Package | Job |
| --- | --- | --- |
| `Lembaran` | `@lembaran/framework` | platform only: `adapter/` contract, `files/` pick + hash, `opfs/` source store, `handles/` Dexie store, `licenses/` notice data. **No React, no CSS, no component.** |
| `Lembaran.UI` | `@lembaran/ui` | reusable GUI: theme tokens (pastel green default, light, dark), `ThemeProvider`, `ThemeToggle`, `useIsDesktop` / `useIsMobile` / `useIsFullscreen`, the reader frames — `shell/desktop/ReaderShell` and `shell/mobile/PhoneShell` (with `mobile/phone.css`) — and `src/components/` — the rail (`SidePanel`, `PanelItem`, `RailThumb`), `Surface`, `Toolbar`, `StatusBar`, `PropertiesPanel` | draw a document, or know a format |
| `Lembaran.App` | `@lembaran/app` | the hub: `feature/{choose,embed,recents}`, `presentations/{layout,component,mobile}` |
| `Lembaran.Pdf` | `@lembaran/pdf` | the reader: `feature/{open,paginate,zoom,search,annotate,fullscreen,shortcuts}`, `storage/annotations.ts`, `presentations/{layout/viewport,ui,component,mobile}` |
| `Lembaran.Csv` | `@lembaran/csv` | the reader: `feature/{open,grid}`, `presentations/{layout/viewport,ui,mobile}` |
| `Lembaran.Docs` | `@lembaran/docs` | the reader: `feature/{open,render,zoom,paginate,find}`, `presentations/{layout/viewport,ui,mobile}` |
| `Lembaran.Pptx` | `@lembaran/pptx` | the reader: `feature/{open,deck,view}`, `presentations/{layout/viewport,component,ui,mobile}` |

Import direction is one way: `Lembaran.App` -> `Lembaran.Pdf` -> `Lembaran.UI` -> `Lembaran`. Never the
reverse, and never reader -> reader. Full rules: `AGENTS/skills/lembaran/references/slices.md`.

## Data flow (verified end to end in a browser)

1. The hub or the reader takes a `FileSystemFileHandle` (or `<input type=file>` bytes on a browser
   without the File System Access API).
2. Bytes are hashed (SHA-256) and copied to OPFS at `lembaran/sources/<hash>.bin`; the handle and
   metadata go to IndexedDB through Dexie.
3. The hub loads the reader as an iframe with `?path=...&name=...`; the reader reads the bytes from OPFS
   by path. No blob crosses the boundary.
4. `openPdf` hands the bytes to pdf.js, which parses in **its own worker**.
5. `PageCanvas` paints a page to a canvas and overlays a text layer for selection and find.

Verified on a generated two-page PDF: dropped on the hub -> iframe at
`/Lembaran.Pdf/index.html?path=lembaran/sources/<sha>.bin` -> both pages painted, text selectable,
find "banana" -> 2 hits, jumping to page 2. Resource timeline: **83 requests, zero external hosts.**

## Measured facts (2026-11-24)

| | raw | gzip |
| --- | --- | --- |
| `pdfjs-dist` (main + worker) | 1.71 MB | 0.50 MB |
| `@betteroffice/xlsx` (not installed yet) | 7.23 MB | 2.84 MB |
| `@betteroffice/pptx` (not installed yet) | 6.01 MB | 2.34 MB |
| `@betteroffice/docx` read-only subset (not installed yet) | 10.65 MB | 4.03 MB |
| `@betteroffice/docx` edit module - **never fetched by a reader** | 23.85 MB | 8.23 MB |
| `papaparse` | 20 KB | 7 KB |
| `docx-preview` + the Word reader | 496 KB | 148.8 KB |
| `@betteroffice/pptx` + the PowerPoint reader | 391.6 KB + 163.2 KB worker + 6.15 MB WASM | 117.4 KB + 43.7 KB + 2.34 MB |

## Known bugs

- None open. Fit-to-width needed a retry loop because `clientWidth` is 0 on the first frame; 20 attempts
  at 50 ms covers a cold iframe.

## Annotations

A highlight is a rectangle normalised to the page box (`x`, `y`, `w`, `h` in 0–1), so it holds still at
any zoom or width. Four colours, a note, delete. Stored in IndexedDB database `lembaran-annotations`,
table `items`, keyed by `docKey` — the document's content hash, taken from the OPFS path, or a
name+size+byte-sample key when the reader was handed bytes. **The PDF is never modified**: annotations
live beside it, so a read-only reader can still take notes.

## Deliberate decisions that look wrong

- **pdf.js runs on the main thread.** Its *parser* runs in a worker already; the paint cannot. So a
  reader has one worker, not two, and the Comlink RPC layer is still a plan item rather than a fact.
- **The hub iframes in development too.** One server serves every HTML entry, so the shipped path is
  the tested path. There is no dev-only import of a reader.
- **`Lembaran.UI` is a separate project.** Theme and device hooks are reusable GUI, not platform; putting
  them in `Lembaran` would have made the framework depend on React.
- **Chrome is shared, documents are not.** `Lembaran.UI/src/components/` owns what every reader draws the
  same way — a rail card and its lazy thumbnail (`RailThumb` takes a painter), the paper frame
  (`Surface`), the top bar, the status line, the inspector — while each format still paints its own
  document and keeps its own controls. The rail is geometry and timing, not a slide strip: the reader
  supplies the pixels, so PowerPoint's engine never enters the GUI package.
- **A 4 MB DOCX engine when a 20 KB one exists.** Resolved: `docx-preview` is what ships. The gate showed
  `@betteroffice/docx` hides layout in its editing module, so a read-only reader would have carried the
  weight of an editor. Fidelity of *pages, styles, tables and footnotes* was enough; the editor's extra
  fidelity is not worth 4 MB until there is an editor.
- **URLs are short (`/pdf/`) while folders keep the full name (`Lembaran.Pdf/`).** The folder is the
  identity; the URL is the address.
- **No native shell, ever.** Web only, by instruction.
- **CSV has its own grid, not a table library.** A data grid costs 200 KB+ and still needs a custom cell
  renderer for this; the virtualized window is 40 lines of arithmetic, tested in
  `feature/grid/viewport.test.ts`.

## Traps

- `tsconfig.json` extends `../tsconfig.base.json` - one level, not two, since the projects moved out of
  `packages/` and `apps/`. If that path breaks, `tsc` stops reading `noEmit` and **emits `.js` files into
  `src/`**, which then shadow `.tsx` in Vite and break the build with a JSX error. If a build complains
  about JSX in a `.js` file, delete the emitted files first.
- `index.html` must load `./src/main.tsx`, not `/src/main.tsx`: the dev server serves each project from
  its own subdirectory.
- pdf.js needs `standardFontDataUrl` and `cMapUrl` on the same origin. Dev reads
  `/node_modules/pdfjs-dist`, production copies them to `/pdf/pdfjs` at build time. A CDN default would
  break the local-only promise.
- **Vite's module cache can serve a stale file after an in-place edit.** Symptom seen today: the disk had
  the fix, the server served the old module, and a runtime recursion survived two reloads. Restarting
  `npm run dev` cleared it. If a change appears not to apply at all, fetch the module URL and grep it
  before doubting the change.
- **A relative `outDir` is resolved against the workspace folder, not the repo.** When the projects moved
  out of `apps/` and `formats/`, `'../../dist'` started pointing at `E:\Programming\dist` — outside the
  repository — while the real `dist/` stayed stale from the previous build, so the build looked fine and
  served old files. Both Vite configs now use absolute paths, and `scripts/build-all.mjs` fails loudly when
  the expected `dist/index.html` or `dist/<slug>/index.html` is missing.
- A callback that both *requests* a fit and *receives* the computed scale must be two props. Wiring
  `onFitScale` to the fit action recurses: `fitWidth → onFitScale → fitWidth`. Types will not catch it.
- The global `button` rule sets a 44 px tap target. An absolutely positioned element that is a `button` —
  an annotation rectangle — inherits it and is inflated. Set `min-width: 0` on anything positioned.
- **Never read `event.currentTarget` inside a `setState` updater.** React runs the updater after the
  handler returns and has already reset `currentTarget` to `null`, so the first scroll of the CSV grid
  threw and unmounted it. Read the fields into locals first.
- `Papa.parse` picks its **worker** overload (which returns `void`) whenever the config carries a field
  the sync overload's type forbids — `newline: ''` did exactly that. Passing `worker: false` and
  `download: false` selects the synchronous string overload, and the result types again.
- `:nth-child` follows **DOM order**, so striping a virtualized list moves as you scroll. Derive the
  stripe class from the row index instead.
- `text-overflow: ellipsis` needs a block container; on a `display: flex` cell it silently does nothing.
- **docx-preview names its wrapper after `className`.** Passing `className: 'docs-page'` produces a
  `<div class="docs-page-wrapper">`, not `docx-wrapper`, and that wrapper ships grey padding of its own.
  Target both names, or the reader inherits an engine's idea of a page background.
- **Render the document off-screen and attach it in one step.** docx-preview appends into the element it
  is given, so two overlapping renders (React StrictMode remounts the effect) append twice and the reader
  shows every page duplicated. Rendering into a detached stage and moving the children atomically, guarded
  by a token, removes the race.
- Reader zoom uses CSS `zoom` on the paper element, not `transform: scale`. `zoom` participates in layout,
  so the scroll height stays correct and `getBoundingClientRect` distances stay comparable between pages;
  `transform` would need the container height patched by hand.
- **A package's `exports` map hides its own WASM from a bare import.** `@betteroffice/pptx` publishes only
  `.`, `./worker` and `./collaboration`, so `@betteroffice/pptx/dist/generated/…wasm` does not resolve;
  importing it by relative path (`../../../node_modules/@betteroffice/pptx/dist/generated/…wasm?url`)
  works, and Vite then serves it in dev and emits a hashed asset in the build. The alternative — a copied
  `public/` blob — drifts from the installed version.
- The slide canvas is sized by the engine (`sizeCanvasForSlide(canvas, list, dpr, scale)`), which sets both
  the backing store and the CSS box. Setting `canvas.width` by hand instead makes every slide blurry at
  `devicePixelRatio > 1`.
- **`RailThumb` paints once per painter identity.** Pass a `useCallback` — an inline `paint` arrow is a new
  function on every render, so the card repaints forever (and a pdf.js render restarts mid-paint). The
  canvas is measured before painting; a painter that hard-codes `RAIL_THUMB_WIDTH` instead of using the
  width it is handed draws a thumbnail wider than its card.
- **A phone layout never shares a file with a desktop layout.** `PhoneShell` lives in
  `Lembaran.UI/src/shell/mobile/`, imports its own `phone.css`, and shares only the neutral
  `Stage`/`Root`/`Body` classes with `shell/desktop/ReaderShell`. Copy markup instead of adding a
  `mobile` prop or a phone `@media` block to a desktop component; `App.tsx` is the only chooser.
