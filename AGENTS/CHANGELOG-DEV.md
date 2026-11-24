# Dev changelog

What moved, by date, newest first. Files, tests, gates and numbers live here; the user-facing record
is in [CHANGELOG.md](CHANGELOG.md). Never rewrite an older day — append, and reverse a decision with a
`Reverted:` line that keeps its reason.

Current version: `0.1.0`, named 2026-11-24. Nothing is built yet; this file starts with the decisions
that were made instead of code.

## 2026-11-24

- **The layout hooks answer three questions, with names that say which one they answer** (API). `layout/`
  held `useIsPhone.ts` and `useFullscreen.ts`, so a reader asked "phone?" and got back a state object when
  it asked for fullscreen. It now holds `desktop.ts` (`useIsDesktop`), `mobile.ts` (`useIsMobile`, the same
  720 px breakpoint) and `fullscreen.ts` (`useIsFullscreen` boolean, plus `useFullscreen` returning
  `supported` / `active` / `toggle` and built on the boolean). Both device hooks read one
  `matchMedia` subscription through `useSyncExternalStore`, so a resize re-renders without a
  mount-time listener and `useIsDesktop` cannot disagree with `useIsMobile`. `useIsPhone` is gone —
  the hub, PDF, Word and PowerPoint `App.tsx` call `useIsMobile()` and name the result `mobile`.
  Verified in a 360×800 and a 1280×800 viewport: the hub switches `hub-shell-phone` ↔ `hub-grid`, the PDF
  switches `.pdf-shell-phone` (no rail) ↔ `.pdf-topbar` + rail, and switching back leaves the page painted.
  Files: `Lembaran.UI/src/layout/{desktop,mobile,fullscreen}.ts`, `Lembaran.UI/src/index.ts`,
  `Lembaran.{App,Pdf,Docs,Pptx}/src/App.tsx`.

- **The general components left the readers and became one library** (architecture). The rail, the paper
  and the bars were either duplicated between readers or buried in the frame's CSS: PDF and PowerPoint
  each hand-rolled a lazy thumbnail canvas with their own observer, eager limit and failure state, and
  each styled its own paper. `Lembaran.UI/src/components/` is now that library — `rail/` (`SidePanel`,
  `PanelItem`, and the new `RailThumb`: card geometry, the lazy paint, pending/ready/failed),
  `surface/` (`Surface`: white sheet, hairline edge, shadow, shrink-to-content), `header/` (`Toolbar` +
  controls), `footer/` (`StatusBar` + items), `properties/` (`PropertiesPanel`: titled groups of
  label/value rows, not opened by a reader yet) — and `ReaderShell` gained the matching `properties`
  slot on the right of the body. `shell.css` imports `components/components.css`, so
  `@lembaran/ui/shell.css` still gives a reader the whole GUI layer in one file. The rails now pass a
  painter instead of owning an effect: pdf.js and `paintDeckSlide` both receive
  `(canvas, width, signal)` and cancel through the signal. Measured after the move (built CSS, gzip):
  PDF **3,996 B** (was 3.9 kB), Word **2,515 B** (2.2 kB), PowerPoint **2,351 B** (2.0 kB), CSV
  **2,709 B** (2.4 kB); the +0.2–0.3 kB is the inspector's CSS shipping ahead of its first user.
  Verified in Chromium: PDF 14/14 thumbs `ready`, cards 173 px, page sheet 420×595 equal to its canvas;
  PowerPoint 31/31 thumbs `ready`, cards 69 px, slide sheet 742×418 equal to its canvas; clicking a card
  navigates in both.
  Files: `Lembaran.UI/src/components/*` (new), `Lembaran.UI/src/shell/{shell.css,index.ts,ReaderShell.tsx}`,
  `Lembaran.Pdf/src/presentations/{component/ThumbnailRail.tsx,layout/viewport/PageCanvas.tsx,pdf.css}`,
  `Lembaran.Pptx/src/presentations/{component/SlideRail.tsx,layout/viewport/SlideCanvas.tsx,pptx.css}`.

- **The rail shrank its own cards, so every thumbnail overlapped the next** (fix). `.lb-panel` is a
  scrolling flex column and `.lb-panel-item` had no `flex`, so a document with more cards than fit
  compressed each item's box (49 px) while the card kept its inline 173 px height — a 14-page PDF read
  as a stack of thumbnails spilling into the following cards. The item is `flex: none` now and the rail
  scrolls. Verified with the 14-page PDF (cards 173 px, panel `scrollHeight` 2516 vs 774) and the
  31-slide deck (cards 69 px).
  Files: `Lembaran.UI/src/components/rail/rail.css` (was `shell/shell.css`).

- **The page stack was gated on an IntersectionObserver, so it could stop updating entirely** (fix).
  Pages painted only when their slot's observer reported intersection. In a browser/iframe where those
  callbacks are delayed or dropped, scrolling kept the first two pages and filled the rest with the dotted
  stage background — "the stack is not updating". The stack now decides from the scroll position it already
  tracks: the page under the viewport is the anchor, and the anchor ±1 (plus pages 1–2) are painted, so
  what is on screen is always drawn and the rest stay correctly sized placeholders. Verified by wheel
  scrolling a 14-page document at 1136×900: status/rail marched `3 → 5 → 7 → 9` and the painted pages went
  `1,2,4` → `1,2,8,9,10`, with 14 slots kept in the DOM for the scrollbar.
  Files: `Lembaran.Pdf/src/presentations/layout/viewport/PdfViewport.tsx`.

- **Three colour modes, and pastel green is the default** (UI). `ThemePreference` is now
  `pastel | light | dark` — the `system` mode is gone by instruction. `[data-theme='pastel']` adds a mint
  paper world (`--lb-bg #f1f7f2`, `--lb-surface-2 #e4efe6`, accent `#5f9d6d`, text `#1e2a22`) while the
  existing `light` and `dark` blocks are untouched. The toggle cycles pastel → light → dark → pastel with a
  leaf, sun and moon icon, the choice is stored in `localStorage['lembaran.theme']`, and a `storage`
  listener applies it to every reader iframe at once. The cycle order and the accepted values are pure
  functions (`theme/preference.ts`) with a unit test, so `npm test` covers them.
  Verified: a fresh profile paints `data-theme="pastel"` with `--lb-bg #f1f7f2`, and three clicks return to
  pastel (`pastel → light → dark → pastel`).

- **The rail's geometry is now plain pixels, because a rail that sizes itself cannot be trusted** (fix).
  `.lb-panel` and `.lb-panel-card` took their width from `--lb-rail` and their height from `aspect-ratio`,
  so a missing custom property or an engine that resolves the aspect differently collapses the column —
  which is what a squashed or empty left panel looks like. `SidePanel` sets `width: 168` and `PanelItem`
  sets `width: 122` plus a computed `height` inline; nothing about the rail depends on a CSS variable,
  `aspect-ratio` or the canvas. Measured: panel 168, both PDF cards **122×173**, raster painted at 118 wide,
  both `ready`.

- **The reader frame moved into `Lembaran.UI`, and every reader now composes it** (architecture). Four
  readers had four copies of a toolbar, a status bar, an empty-state card, a side rail and a phone bar, and
  they had already drifted: the PowerPoint rail rendered squashed thumbnails, the CSV status bar spelled
  its separator itself, the Word prompt had its own button style. `@lembaran/ui` now ships the frame —
  `ReaderShell` (toolbar · banner · body{panel, stage} · status), `PhoneShell`, `Toolbar`/`ToolbarGroup`/
  `ToolButton`/`ToolReadout`, `SidePanel`/`PanelItem` (aspect-driven cards), `StatusBar` + items,
  `EmptyState`, `Stage`/`StageOverlay` — plus `shell.css` and two new tokens (`--lb-control`, `--lb-rail`).
  Each reader keeps its own feature logic and its own document presentation; CSS that laid out the frame is
  gone from all four projects (PDF 14.2 → 3.9 kB gzip, Word 5.6 → 2.2, PowerPoint 5.6 → 2.0, CSV 6.3 →
  2.4). Verified in Chromium with all four fixtures: `.lb-root` height equals the viewport (no page
  growth), the panel scrolls internally, toolbar/stage/status are present in each, no overlays.
  Files: `Lembaran.UI/src/shell/*`, and every `presentations` tree of `Lembaran.{Pdf,Csv,Docs,Pptx}`.

- **The PowerPoint rail was not broken, it was distorted — and it was distorted by a 4 px guess** (fix).
  Thumbnails were painted at `RAIL_THUMB_WIDTH` (124 px) while the card's content box was 112 px (the
  panel reserves a scrollbar gutter), so `max-width: 100%` clamped the width and left the height alone:
  a 960×540 slide drew as 112×70 instead of 112×63 and every thumbnail in the user's 31-slide deck looked
  squeezed. A thumbnail is now painted at the width its card actually has, the card takes its aspect from
  the deck, and the first twelve paint eagerly (an IntersectionObserver is not delivered in a backgrounded
  tab, which is why the rail could look empty). Unpainted cards show a shimmer, failed ones a dashed
  outline, so neither reads as "error". Measured after the fix: card content 112, canvas 112×63, ratio
  1.78 — no distortion, and the rail scrolls 1625 px of content inside a 774 px column.

- **"No hot reload" was a stale transform, not a missing watcher** (fix). The dev server kept serving a
  module from before an edit — `/Lembaran.Pptx/src/App.tsx` came back with `EmptyState` from the first
  edit but still the wrapper `div` from before the second, so the layout stayed broken through reloads
  until the process was killed. Windows drops native file-watch events often enough for that to happen
  repeatedly; the dev server now polls (`watch: { usePolling: true, interval: 150 }`), keeps
  `react`/`react-dom` pre-bundled so a page load cannot trigger a re-optimize, and shows the HMR overlay.
  Verified live: a CSS edit changed the running reader in 1.8 s and a TSX edit swapped the component
  without a page load (a `window` marker survived both).

- **A reader that failed to start can be reloaded from the hub** (fix). The banner used to instruct the
  user to restart the dev server; it now offers a **Reload reader** button (the iframe remounts), and the
  hub remembers the open document in `sessionStorage`, so the full reload Vite sends when a reader entry
  module changes no longer drops you on the launcher. Verified: drop a deck, reload the page, the deck
  reopens at the same OPFS path.

- **The PDF reader paints its first two pages without an observer** (fix). With pages gated on
  `IntersectionObserver` alone, a tab that had not delivered callbacks showed an empty document.
  Files: `Lembaran.Pdf/src/presentations/layout/viewport/PdfViewport.tsx`.

- **PowerPoint reader shipped on the WASM engine the plan named** (D3). `@betteroffice/pptx` parses a deck
  and hands back a display list; the reader paints it to a canvas, one canvas for the current slide and a
  thumbnail canvas per slide painted only when it scrolls into the rail's observer window. Fixture
  `samples/hello.pptx` (3 slides, generated by `scripts/make-sample-pptx.mjs`) renders with real text,
  heading sizes, a filled rounded rect and slide backgrounds. Measured payload: reader 391.6 KB →
  **117.4 KB gzip**, its layout worker 163.2 KB → 43.7 KB gzip, WASM 6.15 MB → **2.34 MB gzip** — the
  earlier tarball estimate, confirmed in a build. Verified in Chromium at 1200×900: fit 78%, `+` reaches
  98%, page keys move the canvas (`aria-label` follows), full screen on the reader root, and **zero
  external requests across 43 resources**. Opening from the hub's recent list re-runs the same path.
  Files: `Lembaran.Pptx/src/{App.tsx,feature/{deck,view,open},presentations/*}`,
  `scripts/make-sample-pptx.mjs`, `samples/hello.pptx`.

- **Word reader shipped, and the DOCX engine gate resolved the other way** (D2). The gate asked whether
  `@betteroffice/docx` could render read-only without ever fetching its 23.85 MB editing WASM. It cannot:
  the package exposes `parseDocx`/`repackDocx`/`createDocx` and puts layout in an editor-oriented module,
  so the reader would pay the editor's weight to show a page. `docx-preview` (Apache-2.0) lays real OOXML
  out as pages instead: `samples/hello.docx` renders as **2 pages** with a title, heading styles, bold /
  italic / coloured runs, a bullet list with real numbering, a bordered table, and an explicit page break
  honoured between them. Reader bundle: **496 KB raw → 148.8 KB gzip** (React included). Verified in
  Chromium at 1000 px: page 794×1122, fit width 100%, zoom to 120% measures 952 px, `0` restores 100%,
  find "banana" → `1 / 2` with the second hit in the following page, page 2 scrolls to a section top of
  0 px, full screen on the reader root, **zero external requests** across 46 resources.
  Files: `Lembaran.Docs/src/{App.tsx,feature/{open,render,zoom,paginate,find},presentations/*}`,
  `scripts/make-sample-docx.mjs`, `samples/hello.docx`.

- **Two license gates were auditing only the projects that existed when they were written** (A, fix).
  `scripts/licenses-check.mjs` and `scripts/gen-notices.mjs` each carried a hardcoded
  `['Lembaran','Lembaran.UI','Lembaran.App','Lembaran.Pdf']`, so `papaparse`, `docx-preview` and `jszip`
  were never audited — the gate reported "passed for 10 dependencies" while 12 were installed. Both now
  discover every `Lembaran*` folder with a `package.json`. `gen-notices` also tried to read a package's
  `LICENSES/` folder as a file (`EISDIR`); it now filters to files. Gate now covers **11 declared
  dependencies**, and `jszip` — dual `MIT OR GPL-3.0-or-later`, transitive through docx-preview — is
  recorded in `AGENTS/FRAMEWORK.md` with the permissive option named.
  Files: `scripts/licenses-check.mjs`, `scripts/gen-notices.mjs`.

- **CSV reader shipped** (D5). `papaparse` parses text once per delimiter change and a bespoke grid
  renders only the visible window: `samples/cities.csv` (20 KB, 401 rows) keeps **40 row nodes** in the
  DOM at 900×800 instead of 401. Delimiter detection with a manual override, a sticky row-number gutter,
  a sticky column header that follows `scrollLeft` by transform, cell selection in the status bar
  (`B15: City 14`), theme and full screen. Measured payload: **341.8 KB raw → 106.7 KB gzip** JS plus
  1.7 KB gzip CSS. Verified in Chromium at 1400/900/640 px: header and cells share one x, gutter holds
  at x=0 under 207 px of horizontal scroll, separator switch collapses 7 columns to 1 and back.
  Files: `Lembaran.Csv/src/{App.tsx,feature/grid/*,presentations/*}`.

- **Four defects in the CSV grid, all found by scrolling it** (D5, fix). (1) The scroll handler read
  `event.currentTarget.scrollTop` *inside* the `setState` updater, which React runs after the handler
  returns and after it has reset `currentTarget` — the first scroll threw `Cannot read properties of null`
  and unmounted the grid; the values are now read into locals first. (2) `Papa.parse` with
  `newline: ''` failed to type-check and fell through to papaparse's worker overload, whose return type is
  `void`; `worker: false, download: false` selects the synchronous string overload and the result types
  again. (3) Row banding used `:nth-child(even)`, which follows DOM order — with virtualization the
  stripes moved as you scrolled, so the class is now derived from the row number. (4) `text-overflow:
  ellipsis` did nothing on a `display: flex` cell; cells are block boxes with an explicit line height.
  Also: the visible-range helpers clamp `first` to `rowCount - 1`, so a stale `scrollTop` cannot produce
  an inverted range that renders nothing.

- **The page rail did not stack like a column, and the page sat in a guessed slot** (D1b, fix). Every
  thumbnail card is now one geometry — `123×184`, frame `104`, number gap `6`, for current and idle alike —
  and the current page is marked with an outline that does not change its box, instead of a border plus a
  fill that made the selected card look like a different element. The slot was `640 × scale`, a guess, so a
  420 pt page floated inside 640 px of phantom space; it now uses the page's own width, so slot and page
  both measure 420 and the page is centred. `scrollbar-gutter: stable both-edges` removes the last
  7.5 px of asymmetry the 15 px scrollbar caused — measured offset from centre is now 0.
  Files: `Lembaran.Pdf/src/presentations/{pdf.css,component/ThumbnailRail.tsx,layout/viewport/PdfViewport.tsx}`.

- **The hub is the site root in development too** (C). `http://localhost:5173/` served nothing because
  Vite serves files, and the hub lived at `/Lembaran.App/index.html`. A development-only root
  `index.html` now renders the hub, so `/` is the same address it has in production, and a reader gets a
  short link: `/pdf/` redirects to its project entry. The dev server prints both.
  Files: `index.html`, `vite.dev.config.ts`.

- **The build was writing outside the repository.** After the projects moved from `apps/` and `formats/`
  to the repo root, `outDir: '../../dist'` resolved against the workspace folder and landed in
  `E:\Programming\dist`; `Lembaran\dist` kept the previous run's files, so the build printed success and
  the site served stale output. Both Vite configs now use absolute paths, `scripts/build-all.mjs` asserts
  `dist/index.html` and `dist/<slug>/index.html` after each build, and a clean run writes only inside the
  repo (verified: stray `E:\Programming\dist` gone, `dist/_headers` 596 bytes with `#` comments).
  Files: `Lembaran.App/vite.config.ts`, `Lembaran.Pdf/vite.config.ts`, `scripts/build-all.mjs`.

- **Five UI defects found by driving the app, not by reading it** (D1b, fix). (1) `.pdf-page` stretched
  to the slot (640 px) while the canvas was 420 px, so the annotation overlay was wider than the paper and
  a highlight's normalised rect meant the wrong area — the page now uses `width: fit-content`, and
  page and overlay both measure 420×595. (2) The global `button { min-width: var(--lb-tap) }` inflated
  every annotation rectangle to at least 44×44; `.pdf-highlight` now sets `min-width: 0`. Measured: a
  50×20 drag renders 50×20. (3) `ThemeToggle` rendered with class `lb-icon-button`, which had no styles
  anywhere, so it fell back to a 44 px default button — the class is now defined in `Lembaran.UI`'s tokens
  and measures 32×32 like every other icon control. (4) `_headers` used `/* … */` comments, which the
  static host does not understand; Cloudflare/Netlify want `#`, so the whole file was misparsed and COOP/
  COEP would never have been sent. (5) Clicking the page away from a note did not close it, because the
  overlay is `pointer-events: none` when not annotating; the page itself now clears the selection.
  Files: `Lembaran.Pdf/src/presentations/{pdf.css,layout/viewport/PageCanvas.tsx}`, `Lembaran.UI/src/theme/tokens.css`, `Lembaran.App/public/_headers`.

- **`npm run dev` inside `Lembaran.App` served only that folder, so the reader 404'd** (fix). The dev
  config's `root` was `'.'`, resolved against the working directory — correct from the repo root and
  useless from a project. `root` is now absolute (`import.meta.dirname`), and both `Lembaran.App` and
  `Lembaran.Pdf` point their own `dev` script at the same config, so any entry point serves the whole
  repository. The server prints the URL of every project it serves, and `strictPort` is off so a busy
  5173 falls through instead of failing. The hub now also notices a reader that never mounted and says
  so, instead of showing a blank frame.
  Files: `vite.dev.config.ts`, `Lembaran.App/package.json`, `Lembaran.Pdf/package.json`, `Lembaran.App/src/presentations/component/ReaderFrame.tsx`.

- **The reader is a reader now: full screen, annotations, page rail, shortcuts** (D1b). Toolbar rebuilt
  around grouped icon controls with a light/no-chrome look; a 136 px thumbnail rail renders each page
  lazily through an `IntersectionObserver`; a status bar carries page, zoom and note count. Full screen
  uses the real Fullscreen API on `.pdf-root` and swaps the toolbar for a slim, hover-opaque bar.
  Annotations are rectangles normalised to the page box, drawn in an overlay above the text layer, with a
  note card, four colours and delete — stored in IndexedDB (`lembaran-annotations`, keyed by content hash),
  never written into the PDF. Verified: drag → note → `1 note` in the status bar; after reload the
  highlight and its aria-label survive; `Escape` closes find, `ArrowRight` moves to page 2, `h` arms the
  highlighter, `0` performs a true fit (301% on a 420 pt page in a 1289 px viewport).
  Files: `Lembaran.Pdf/src/{feature/annotate,feature/fullscreen,feature/shortcuts,storage/annotations.ts,presentations/**}`.

- **Two defects the browser caught.** `fitWidth` called back into itself because the viewport's
  `onFitScale` was wired to the *fit action* instead of to `setZoom` — an infinite recursion that only
  appears at runtime, not in types. And the initial fit magnified a small page to 301%; opening now uses
  `min(1, fitZoom(...))`, so a small page reads at 100% while the Fit button still does a true fit.
  Files: `Lembaran.Pdf/src/App.tsx`, `presentations/layout/viewport/PdfViewport.tsx`.

- **One build command assembles the whole site and links every reader** (C). `npm run build` runs
  `scripts/build-all.mjs`: the hub builds first and owns `dist/` (it empties it), then each
  `Lembaran.<Format>` that declares a `lembaran` block in its package.json builds into `dist/<slug>/`.
  The hub's registry is generated by `scripts/gen-readers.mjs` from the projects on disk, so a new reader
  appears in the app by existing — no list to forget. Verified: `Building the hub, then 1 reader(s)` →
  `dist/index.html` + `dist/pdf/`, and the hub lists PDF (openable) then Word, PowerPoint, Excel, CSV as
  planned. `npm run readers:check` fails when the generated registry is stale.
  Files: `scripts/{build-all.mjs,gen-readers.mjs}`, `Lembaran.App/src/feature/choose/{registry.ts,registry.generated.ts}`, `Lembaran.Pdf/package.json`.

- **`Lembaran` holds no UI; `Lembaran.UI` is a project of its own** (A). The framework had picked up
  `theme/ThemeProvider.tsx`, `theme/tokens.css` and `layout/useIsPhone.ts`, which made it depend on React
  and made "framework" mean two things. Those moved to `Lembaran.UI` (`@lembaran/ui`), joined by
  `ThemeToggle`. `Lembaran` is now platform only: adapter contract, file access, OPFS, handle store,
  notice data — 7 files, **zero `.tsx`, zero `.css`**.
  Files: `Lembaran.UI/**`, `Lembaran/src/index.ts`, `Lembaran/package.json`.

- **The PDF reader ships, read-only, and the whole path is verified in a browser** (D1). `pdfjs-dist`
  renders pages to a canvas with an overlaid text layer, virtualized by an `IntersectionObserver` with an
  800 px margin; pages are placeholders until they are near the viewport. Verified on a generated
  two-page PDF dropped on the hub: the iframe received
  `/Lembaran.Pdf/index.html?path=lembaran/sources/<sha256>.bin`, both pages painted, text selectable, and
  find "banana" returned 2 hits and jumped to page 2. Resource timeline: **83 requests, zero external
  hosts**. Build: reader **238 kB gzip** + 372 kB worker; hub **102.7 kB gzip**, and the hub bundle
  contains no reference to `pdfjs`, `PdfApp`, `PdfViewport` or `lembaran/pdf`.
  Files: `Lembaran.Pdf/src/{App.tsx,main.tsx,adapter.tsx,feature/**,presentations/**}`.

- **Fit-to-width, because a 420 pt page was wider than the phone.** The first render put a 420 px canvas
  into a 512 px viewport at scale 1 and clipped it on anything narrower. `fitZoom(available, pageWidth)`
  now runs once per document; the first attempt read `clientWidth === 0` on a cold iframe, so the effect
  retries up to 20 times at 50 ms. Result on the test viewport: canvas 488×691 inside 512, no horizontal
  overflow (`scrollWidth === clientWidth`). Test: `feature/zoom/store.test.ts` covers the fit and its
  floor.
  Files: `Lembaran.Pdf/src/feature/zoom/store.ts`, `presentations/layout/viewport/PdfViewport.tsx`.

- **`Lembaran` holds no UI; `Lembaran.UI` is a project of its own** (A). The framework had picked up
  `theme/ThemeProvider.tsx`, `theme/tokens.css` and `layout/useIsPhone.ts`, which made it depend on React
  and made "framework" mean two things. Both moved to `Lembaran.UI` (`@lembaran/ui`), whose job is the
  reusable GUI layer every front-end project can share. `Lembaran` is now platform only: adapter
  contract, file access, OPFS, handle store, notice data — no React, no CSS, no component.
  Files: `Lembaran.UI/**`, `Lembaran/src/index.ts`, `Lembaran/package.json`.

- **A broken `tsconfig` path silently emitted 46 `.js` files into `src/`** (fix). Moving the projects out
  of `packages/` and `apps/` left `extends: "../../tsconfig.base.json"` pointing at
  `E:/Programming/tsconfig.base.json`; `tsc` then ran without the base, ignored `noEmit`, and wrote
  JavaScript beside every source file. Vite preferred the `.js`, and the build died on
  `Unexpected JSX expression` in `src/App.js`. The extends paths are now `../`, the emitted files are
  deleted, and the trap is recorded in `DEVNOTES.md`.
  Files: `Lembaran*/tsconfig.json`, `AGENTS/DEVNOTES.md`.

- **The engine question is settled with measured numbers, not estimates** (A). Every candidate was
  downloaded and its shipped files gzipped, because "about 5 MB" had already led the plan wrong once.
  Read-only payloads: `pdfjs-dist` 1.71 MB → **0.50 MB**, `@betteroffice/xlsx` 7.23 MB → **2.84 MB**,
  `@betteroffice/pptx` 6.01 MB → **2.34 MB**, `@betteroffice/docx` (parse + layout + opc) 10.65 MB →
  **4.03 MB**, `papaparse` 19 KB → **7 KB**. All five formats together are 25.6 MB raw / 9.7 MB gzip,
  loaded per format. The answer to "can the kernel stay under 100 MB" is yes, by roughly 4×.
  Files: `AGENTS/FRAMEWORK.md`, `AGENTS/skills/lembaran/references/engines.md`.

- **`@betteroffice/docx` hides a 23.85 MB edit module beside the read-only set** — the trap that would
  have made DOCX look like a 34.5 MB reader. The read-only path is `parse` (6.27 MB) + `layout`
  (4.27 MB) + `opc` (0.38 MB); `docx_edit_bg.wasm` (23.85 MB, 8.23 MB gzip) must never be fetched by a
  reader. The DOCX chunk is now gated on a network trace proving it, recorded as D2 in `PLAN.md`.
  Files: `AGENTS/PLAN.md`, `AGENTS/skills/lembaran/references/engines.md`.

- **GPL and AGPL were measured and rejected on evidence, not taste** (A). LibreOffice→WASM has no
  maintained browser port (`chase/lok-wasm` 11★, `szsz/libreoffice-core-wasm` 2★,
  `liudonghua123/libreoffice_wasm` last push 2022), ships 300 MB+ with a virtual filesystem and a
  multi-minute cold start; ONLYOFFICE `sdkjs` is AGPL-3.0 and its network clause reaches the whole
  combined work; `pptx-preview` is ISC on npm but **minified-only with non-open source**, which
  disqualifies it for an open-source repository. Recorded that a license has no performance property:
  in a browser the cost is download → compile → instantiate → startup.
  Files: `AGENTS/skills/lembaran/references/engines.md`, `AGENTS/FRAMEWORK.md`.

- **Web only, with no native shell** (A). Tauri, Electron and Capacitor were removed from the design on
  the user's instruction; desktop and mobile are the same static `dist/` in a browser, and the only
  install path is *Add to Home Screen*. The consequence is written down instead: capability gaps are
  handled by feature detection and fallback (no File System Access API on iOS → `<input type=file>` +
  OPFS copy; no `SharedArrayBuffer` → single-threaded WASM), never by a platform branch.
  Files: `AGENTS.md`, `.github/copilot-instructions.md`, `PLAN.md`.

- **Each reader owns its logic and its GUI, as vertical slices; one dev server** (C, D). Adopted
  Sanggar.Editor's shape: `feature/<name>/` per capability (store, actions, selectors, test beside it)
  and `presentations/{layout,component,library,ui,mobile}/` for every pixel. Canonical statement:
  `AGENTS/skills/lembaran/references/slices.md`. In development one Vite server at the repo root serves
  the hub and every reader, and the hub **iframes** the chosen reader — the user has no capacity to run
  five servers.
  Files: `AGENTS/skills/lembaran/references/slices.md`, `AGENTS/ARCHITECTURE.md`, `AGENTS/PLAN.md`.

- **Superseded: the dev-mode dynamic import.** The earlier plan had `import.meta.env.DEV` import a
  reader's `./dev` entry into the hub document. Replaced by an iframe in both modes: a
  dead-code-eliminated import is only *probably* gone, while an iframe makes it structural — and the
  path that ships is then the path that is tested.
  Files: `Lembaran.App/src/feature/embed/handoff.ts`.

- **Package manager is npm, and there is no Turborepo.** `pnpm` is not installed here and
  `corepack enable` needs admin; npm workspaces do the job with zero setup and root scripts fan out with
  `--workspaces`. Turborepo went with it — less tooling for the same result.
  Files: `package.json`.

- **The repo is a master folder with one project per folder, Sanggar-style.** `Lembaran` (framework),
  `Lembaran.App` (hub), `Lembaran.Pdf` (reader), and later `Lembaran.Docs`, `Lembaran.Pptx`,
  `Lembaran.Excel`, `Lembaran.Csv`. Packages are `@lembaran/framework`, `@lembaran/app`,
  `@lembaran/pdf`. Deployed URLs stay short (`/pdf/`) while folders keep the full name.
  Files: `package.json`, `Lembaran*/package.json`, all `AGENTS/*.md`.

- **The `AGENTS/` structure is adopted from Sanggar** (A). Root `AGENTS.md` as a thin contract,
  `.github/copilot-instructions.md` for standing rules, and `AGENTS/` holding `ARCHITECTURE.md`,
  `PLAN.md`, `CHANGELOG.md`, `CHANGELOG-DEV.md`, `DEVNOTES.md`, `LIMITATION.md`, `LARGEFILES.md` and
  `skills/`. The earlier plan's `.github/skills/` plus an `agents/skills/` mirror is **superseded**: one
  copy per skill, under `AGENTS/skills/`, or the two drift.
  Files: `AGENTS.md`, `.github/copilot-instructions.md`, `AGENTS/**`.

- **The two skills the user asked for exist as skills, not notes.** `license-compliance` encodes
  record → classify → place → disclose, with the copyleft table and the rule that a license living only
  in `node_modules` has not been disclosed. `planning-annotations` requires every plan to annotate
  framework, license, size, use case and plumbing, with the rejected alternative named.
  Files: `AGENTS/skills/license-compliance/SKILL.md`, `AGENTS/skills/planning-annotations/SKILL.md`.

- **Read order is PDF → DOCX → PPTX → XLSX → CSV, one chunk at a time** (D). A chunk is done when its
  reader builds, its own Playwright spec passes, and it makes no external request. PDF first because it
  is the cheapest proof of the whole stack (0.50 MB engine, text layer and search included) and needs no
  gate; the OOXML formats follow the engine gate.
  Files: `AGENTS/PLAN.md`.

- **`FRAMEWORK.md` is the registry of record**, not documentation. One row per dependency: engine,
  pinned version, license, measured raw→gzip size, and the reason it was chosen. A version bump
  re-measures in the same commit, and drift against `package-lock.json` and the build report fails the gate.
  Files: `AGENTS/FRAMEWORK.md`.
