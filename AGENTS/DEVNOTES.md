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
**148.8 kB gzip**, PowerPoint reader **117.4 kB gzip + 43.7 kB worker + 2.34 MB WASM**, Excel reader
**120.1 kB gzip (117.5 JS + 2.6 CSS) + 2.91 MB gzip WASM**, in **8 s** for the whole site
(19 MB in `dist/`).

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
| `Lembaran.Excel` | `@lembaran/excel` | the reader: `feature/{open,workbook,view}`, `presentations/{layout/viewport,component,ui,mobile}` |

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
| `@betteroffice/xlsx` (engine) | 7.58 MB WASM | 2.91 MB |
| `@betteroffice/pptx` (engine) | 6.15 MB WASM | 2.34 MB |
| `@betteroffice/docx` read-only subset (not installed yet) | 10.65 MB | 4.03 MB |
| `@betteroffice/docx` edit module - **never fetched by a reader** | 23.85 MB | 8.23 MB |
| `papaparse` | 20 KB | 7 KB |
| `docx-preview` + the Word reader | 496 KB | 148.8 KB |
| `@betteroffice/pptx` + the PowerPoint reader | 391.6 KB + 163.2 KB worker + 6.15 MB WASM | 117.4 KB + 43.7 KB + 2.34 MB |
| `@betteroffice/xlsx` + the Excel reader | 385.9 KB + 10.8 KB CSS + 7.58 MB WASM | 117.5 KB + 2.6 KB + 2.91 MB |
| Substitute fonts (16 faces, `public/fonts`) | 8.2 MB | 4.1 MB |
| — per family | Carlito 2.61 MB, DejaVu Sans 2.62 MB, Liberation Sans 1.57 MB, Liberation Serif 1.45 MB | 1.12 / 1.35 / 0.83 / 0.81 MB |

## Fonts

Calibri, Arial, Helvetica, Times New Roman, Times and Verdana are proprietary: they are never served,
downloaded or embedded. Lembaran ships **open faces as substitutes** and aliases them under the
document's own family names, so a document that asks for "Arial" gets Liberation Sans without knowing
it, and PDF text stays the size the file intends:

| Document family | Substitute | Licence | Metrics |
| --- | --- | --- | --- |
| Calibri | Carlito | OFL-1.1 | metric-compatible |
| Arial, Helvetica | Liberation Sans | OFL-1.1 | metric-compatible |
| Times New Roman, Times | Liberation Serif | OFL-1.1 | metric-compatible |
| Verdana | DejaVu Sans | Bitstream Vera | **approximate**, wider than Verdana |

Where it plugs in:

- `public/fonts/` holds the 16 TTFs, `manifest.json` (family, faces, weight, style, licence file,
  copyright, source, version), `README.txt` and `licenses/`. The hub's `publicDir` is the repository's
  `public/`, so `dist/` gets `fonts/` and `_headers` at the site root; `scripts/build-all.mjs` copies
  `public/fonts` again and fails if a face or `dist/fonts` is missing.
- `Lembaran.UI/src/theme/fonts.css` declares 24 `@font-face` rules that name the **document** family
  (`font-family: Calibri`) and point at `/fonts/*.ttf`. A `local("Calibri")` source comes first: a
  machine that owns the real font uses it, and only then the substitute downloads. This is what makes
  docx-preview's inline `font-family: Calibri` and a canvas `ctx.font = '16px Arial'` resolve at all.
- `Lembaran.UI/src/theme/standardFonts.ts` exposes `loadStandardFonts()`, which asks
  `document.fonts.load()` for the 24 specs. The Word reader awaits it before `renderAsync`, because
  docx-preview paginates by measuring text: measuring before the substitute exists bakes the wrong page
  breaks in. The Excel grid repaints once when the faces are ready. It never rejects — a missing face
  must degrade to the browser fallback, not fail a document. It warms all six families because a `.docx`
  does not say which ones it will use until it is laid out; a face whose `local()` matches an installed
  original costs nothing, so the worst case (**4.1 MB gzip**) only happens on a machine that owns none of
  the four Microsoft families, and only once per browser cache.
- The PowerPoint engine paints in WASM and never sees CSS, so it needs bytes:
  `Lembaran.Pptx/src/feature/fonts/fonts.ts` fetches faces and `openDeck` registers them with
  `handle.registerFont(face)` under the document's family names. **Only the families the deck names
  are fetched** — `namedFamilies(handle.snapshot())` walks every slide's shapes and runs first. A deck
  that uses only Arial pulls 0.83 MB, not 4.1 MB. Registration happens after `openPresentation` and
  before the first `layoutSlide`, so the first paint already has the metrics.
- Fetch failures are skipped (`Promise.all` of byte fetches that resolve to `null`), and an unknown
  family is simply not registered: the engine draws those runs with its own face. Better a slightly
  wrong glyph than an empty slide.

## The palette, and where white is allowed

One palette, two modes: **pastel green** (default) and **dark**, both in
`Lembaran.UI/src/theme/tokens.css`. Green acts, clay points: `--lb-accent` (dark green) is the only
colour a filled button may use, `--lb-accent-2` (clay) marks attention — conflicts, warnings, the
"this is not remembered" flag — and is never a commit colour. `--lb-text`, `--lb-surface` and
`--lb-bg` are all green-tinted, so the chrome reads as one material.

`--lb-paper` is the **only white in the app** and it means one thing: the sheet a document is drawn on.
`surface.css`, the rail thumbnail and the Excel canvas point at it; nothing else may be `#fff`. The
retired warm `light` theme is folded into pastel by `normalisePreference`, so a browser that stored
`light` lands on pastel rather than on no theme at all.

Shared control classes live at the bottom of `tokens.css` (`lb-primary`, `lb-ghost`, `lb-marker`,
`lb-chip`, `lb-label`, `lb-field`) — a hub, a reader toolbar and a phone bar then look like the same app
without either of them importing the other.

## The hub

**PDF editing (0.2 of the reader).** The PDF reader writes now, and the shape of that is: an edit record in
IndexedDB (`storage/edits.ts`, database `lembaran-pdf-edits`, tables `edits` + `blobs`) holds a **page plan**
(order, per-page rotation, blank pages) and the **items** placed on pages (text, image, ink, highlight). The
viewer draws `source pages + record` through a **display list** (`feature/edit/model.ts` → `displayPages`), so a
deleted page is absent, a rotated page renders with pdf.js's own `rotation` argument, and a blank page is a
`Surface` with no canvas. Saving (`feature/save/`) replays the record with **pdf-lib**: pages are copied in
order, a rotated page becomes a new page of the swapped size with the old one drawn into it (so `/Rotate` is
always 0 and normalised item boxes mean the same thing on every page), items are drawn in display coordinates,
then the bytes go **over the file the user opened** through the `FileSystemFileHandle` the recents table kept
(`recentByPath` + `ensureWritePermission`), falling back to `saveBytesAs` when there is no handle. Compression is
two opt-in passes: a lossless structural rewrite, and an image pass that re-encodes JPEG XObjects only —
**text is never rasterised**.

`Lembaran.App` is two layouts and one feature layer. `HubShell` (desktop) is a fixed bar — brand,
search, scale, theme — over three sections in a fixed order (Folder, Readers, Recent);
`HubMobileShell` is brand + theme over three tabs with one section visible. They share only
`presentations/props.ts` and `ReaderCard`; the folder panel is `layout/FolderLibrary.tsx` on desktop and
`mobile/MobileFolderList.tsx` on a phone.

**The desk shell is a window, not a page.** `.hub-shell` is `height: 100%; overflow: hidden`, the bar and the
foot are `flex: none`, and `.hub-main` takes the remainder and scrolls — so the scroll region begins exactly at
the bar's bottom edge and nothing ever slides underneath it (a sticky bar with a blurred backdrop let the
content show through). `.hub-main` is full width so its scrollbar ends at the window's edge; the 1080 px
reading column lives inside it in `.hub-main-inner`.

A reader is framed, not re-skinned: `layout/HubShell` hands the document to `ReaderFrame`, whose bar is a
**single 30 px line** — a `‹` back control and the document's file name. Everything else in that strip is the
reader's own toolbar, so the hub never repeats a title the reader already shows.

`Ctrl`/`⌘` + wheel is a **document** zoom where a reader owns the view and the **app's** zoom in the hub:
`Lembaran.UI/src/theme/appScale.ts` cancels the browser's own zoom, then either dispatches `lembaran:zoom`
to a registered reader (`onZoomRequest`) or moves a stored app scale between 80% and 150%. A reader
re-lays the page at the new scale — the PDF canvas is re-rastered, so it stays sharp — while the app path
puts the scale on `#root` as `zoom` with the viewport divided out (`width: calc(100vw / s); height:
calc(100dvh / s)`), so the shell keeps filling the window instead of overflowing it. The app-scale preference
is shared the way the theme is (localStorage + storage events), a frame embedded in the hub does **not**
scale itself — its parent already does. The percentage always sits at the end of a **desk** bar as a button
that puts it back to 100%; the phone bar carries none, because a phone has no Ctrl + wheel and the value
could only ever read 100%.

The desk bar is brand, then a **search field that takes the rest of the width** (`flex: 1`, no cap), then the
scale chip and the theme switch, so the bar has no dead gap between them.

**Bound folder** (`feature/folder/store.ts` over `Lembaran/src/folders/`): `showDirectoryPicker` →
`{ id: 'bound', name, handle, boundAt }` in Dexie → `listFolder` walks the tree once and offers only
files a built reader accepts, skipping dot-files, dot-folders and `~$` locks. The walk is bounded by
`FOLDER_DEPTH_LIMIT` (8) and `FOLDER_FILE_LIMIT` (300) and keeps handles rather than bytes, so a folder
that turns out to be a home directory cannot hang the tab.

The section is a **browser**, not a dump: `folderView(files, path)` (pure, in `entries.ts`) turns that one
listing into one level — subfolders first, then the files that live here — and the breadcrumb
(`pathSegments`) walks back up. Stepping into a folder never touches the disk again, and the way out is a
`..` row at the top of the list (an up arrow and the two dots), not a button beside the breadcrumb — the
same row a file manager draws. **A search term replaces the level with results from the whole tree**:
`searchFolder` returns matching folders (tap one to navigate to it) and matching files wherever they live,
each row carrying its folder in the meta line, so `q1` finds `reports/2024/q1.pdf` from the top of the
folder and `2024` offers the folder itself. The list is exactly **ten 44 px rows** (`max-height: 440px;
overflow-y: auto`) so the page never grows with the folder. On a desk, `Expand` opens the same browser in a
dialog at **90 vw × 90 vh** over `blur(10px)` on a darkened page (`layout/FolderOverlay.tsx`), with its own
search field, a **Folders / All files** switch, and the list taking the height instead of stopping at ten
rows; Escape, the Close button and the backdrop all dismiss it. **A phone has no expand**: the folder is
already its own tab with the whole screen, so the phone panel is the browser alone (`mobile/`) and the
overlay files are gone.

The header's actions are **icons** (`component/icons.tsx`, 18 px glyphs in 34 px buttons on a desk, 16 px in
36 px buttons on a phone — the phone comes down a size so the header fits) with `title` and `aria-label`:
expand (arrows out of a frame, desk only), change folder (folder with a circular arrow), unbind (broken
chain) — no labels to read. The count chip says just `6 files`; `CountChip` is a toggle, not a
hover-only target — a desk opens the tile board on hover (`@media (hover: hover)`), a finger opens it with a tap
and closes it by tapping anywhere else or pressing Escape, because a touch screen has no hover to leave and the
old `:focus` rule left the helper stuck over the list. The line under the list reads `1 folder · 5 files` and
drops the word "here" — and when a folder holds no documents it simply says `0 files`. The `..` row carries an
up arrow and no chevron: a forward arrow on a step out was the wrong direction.

**The folder area owns its history.** `useFolderPath` (`feature/folder/history.ts`) pushes one
`history.pushState` entry per folder step, carrying `{ lbFolder: path }`, and a `popstate` listener applies it
back. So the mouse's back/forward buttons (and Alt+Left/Right) walk the folder tree instead of leaving the hub,
`mousedown` on buttons 3 and 4 is `preventDefault`ed so they cannot act as page controls, and the hook lives
only inside the folder panel — a reader keeps ordinary browser history because the panel is unmounted then.

On a phone the shell itself never scrolls: `.hub-shell` is `overflow: hidden`, `.hub-main` is the flex
remainder, the active section owns `height: 100%` and the folder pane hands its height to the list, so there is
exactly **one** scrollbar — the folder list's — filling the screen instead of stacking a page scrollbar next to
an inner one. Every hub scroller (`.hub-shell`, `.hub-browse`, `.hub-browse-phone`, `.hub-main > section`) is
`scrollbar-width: thin` with an 8 px transparent-track thumb, so the scrollbar reads as a hint, not a widget.
**The scroller owns the right padding, not the shell**: `.hub-main` keeps only a left inset, so a section (or
the folder list inside the pane, which drops the pane's right padding for the same reason) reaches the window's
end and its bar is drawn there instead of floating inside the margin — with 14 px of padding as the gap between
a card and its bar, plus 14 px under the last card, and `scrollbar-gutter: stable` so the cards do not jump when
the bar appears. Measured at 390 × 560: scroller right edge `390`, bar `10 px`, card right edge `366`, gap under
the last card `14`, on both the Readers and the Folder tab. A folder row carries its own padding —
`10px 14px` on a 52 px row, with the 15 px folder icon and a 10 px gap to the name — so the button's edge and
the card's edge are the same box instead of text sitting on the line. In the folder pane only the **list**
reaches the window's end (`margin-right: -14px` cancels the pane inset and the list puts the gap back as its
own padding), so the head keeps its 14 px inset and the action icons stop short of the border — measured head
right `376`, last icon `376`, list right `390`, row chevron inset `14`.
The phone keeps the **search box** the desk has (it filters readers and the bound folder) on the **same top row**
as the wordmark, the version chip and the theme toggle — the chip drops to 9 px there so the row still fits at
390 px, and the toggle is pushed to the end by `.hub-bar-actions`. The version string is not typed twice: Vite
defines `__APP_VERSION__` from `Lembaran.App/package.json` in both `vite.config.ts` and `vite.dev.config.ts`.

A reload keeps the handle but not the permission, so the first look uses `folderPermission` (no prompt) and
Reconnect uses `ensureFolderPermission` (prompt, inside the click). `Change folder` re-puts the same `bound`
record (no unbind first), `Unbind` swaps itself for an inline `Forget / Cancel` pair, and a **recent** can be
dropped with the × at the end of its row — no confirmation, because the file on disk is untouched and the
shortcut is the only thing that goes.

There is deliberately **no Refresh button**: on Chromium a re-walk reads the same directory the tab already
listed, so it can only produce what is already on screen; on Firefox the `webkitdirectory` fallback imported
every file at pick time and cannot see the disk again at all. The listing is re-read when the folder is
bound, when permission is granted again, and on reload — three moments that actually change something.

## Deploy

GitHub Actions builds, Cloudflare Pages only hosts — no build minutes spent on the host side.

- `.github/workflows/build.yml`, Node pinned by `.nvmrc` (22). One job runs `npm run gates`
  (typecheck, tests, licenses, large-files, `readers:check`, build) and uploads the verified `dist/` as
  an artifact; the deploy job downloads that same artifact, so Cloudflare receives exactly what the
  gates passed.
- A second job deploys with `cloudflare/wrangler-action@v3`:
  `pages deploy dist --project-name=${{ vars.CLOUDFLARE_PAGES_PROJECT || 'lembaran' }} --branch=main`.
  It runs on pushes to `main` and on `workflow_dispatch`, never on a pull request (PRs build only).
- Required on the repository: secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and optionally
  the variable `CLOUDFLARE_PAGES_PROJECT`. The Pages project must already exist as a **direct upload**
  project — the workflow uploads files, it does not create the project.
- `dist/_headers` (written by the build from `public/_headers`) carries COOP/COEP/CSP. Those headers are
  load-bearing: `SharedArrayBuffer` and the WASM workers need cross-origin isolation, and `font-src 'self'`
  is what keeps a substitute font from ever leaving the origin. A host that drops `_headers` breaks both.


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
- **The Excel engine runs on the main thread.** `openWorkbook` returns a synchronous handle and is the
  stable API; `openWorkbookSession` (worker) is marked experimental. A reader that must ship therefore
  uses the sync path, exactly as PowerPoint does: one WASM parse when the file opens, then a display
  list per painted frame. The scroll handler repaints on `requestAnimationFrame`, never per event.
- **The app is GPL-3.0-only; the dependencies are not.** The project itself is strong copyleft
  (`docs/adr/0001-adopt-copyleft-license.md`), which Apache-2.0 and MIT components permit as a one-way
  move; each of them keeps its own license and notices. Because the shipped artifact is JavaScript and
  WASM, a public build owes its Corresponding Source: `NOTICE`, `THIRD-PARTY-NOTICES.md` and the
  generated `ownLicense` say so, and the generator prints `package.json.repository` once the repository
  is public. `npm run licenses:check` now also requires the project's own license text in `LICENSES/`,
  and `npm run build` copies `LICENSE`, `NOTICE` and `THIRD-PARTY-NOTICES.md` into `dist/` as `.txt`
  files — the built site is the object code, so the license travels with it, not only beside the source.
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
- **A grid cell can be resized, and the shape is remembered per file.** `feature/grid/sizes.ts` holds one
  `GridSizes` — a sparse `columns` map of dragged widths plus a single `rowHeight`, since a sheet is read as a
  table, not as a pile of boxes — clamped to 64–520 px and 20–96 px. The header's right edge and the gutter's
  bottom edge are 9 px `.csv-grip` spans (18 px wide / 14 px tall on a phone) that start a pointer drag on the
  window, so the pointer may leave the grip; a double-click on one resets it. Widths feed `columnOffsets`, a
  prefix sum, and the visible slice is a **binary search over those offsets** (`visibleSlice`), so an uneven
  sheet virtualizes as cheaply as a uniform one. The store is `localStorage['lembaran.csv.sizes']` keyed by the
  document's name, written 300 ms after the last change rather than once per pointer move.

## Traps

- **A hook after an early return is a crash, not a warning.** Wiring the PDF save handler placed a `useCallback`
  below `if (!current) return …`; React then rendered one more hook than the previous render and the whole reader
  unmounted ("Rendered more hooks than during the previous render"). Every hook — including callbacks that only
  the loaded state uses — belongs above the first conditional return.
- **`Omit<Union, 'id'>` is not a union of omits.** `Omit` keeps only the keys every member shares, so
  `Omit<EditItem, 'id'>` lost `points`, `blobId` and the box fields. The edit store exports `NewEditItem`, a
  distributive omit (`T extends { id: string } ? Omit<T, 'id'> : never`), which is what the tools and the bake
  signature take.
- **pdf-lib cannot embed a page with no contents.** `embedPage` throws "Can't embed page with missing Contents";
  the bake checks `page.node.Contents()` and writes an empty page of the right size instead.

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
- **A framed reader does not print its own name.** The hub's strip already says `‹ file name` one line
  above the frame, so `PhoneShell` asks `isFramed()` (`shell/frame.ts`, `window.top !== window.self`) and
  drops the title when it is inside the hub; standing alone it still shows it. The header row then carries
  `actions` — icon buttons, `lb-phone-icon`, 44 px — at its left, and always ends with the **theme switch**
  plus an optional `end` control after it (PDF draws its own header and follows the same order by hand): on a
  phone the hub's bar is not on screen while a document is open, so the reader has to offer the theme.
- **The sheet canvas is sticky, not absolutely positioned.** The scroller carries a spacer the size of
  the sheet's extent and the canvas is `position: sticky; top: 0; left: 0`; scrolling only changes the
  offsets handed to `displayList`. Moving the canvas with a `translate(scrollTop)` fights the native
  scrollbar and flickers at the edges.
- **Zoom divides the viewport, it does not resize the canvas.** Build the display list at
  `clientWidth / zoom`, paint with `dpr × zoom`, and map a click back through `/ zoom`. Scaling the
  canvas box instead makes the scroll extent and the hit-testing disagree.
- **`@betteroffice/xlsx` hides its WASM behind its `exports` map.** Import
  `node_modules/@betteroffice/xlsx/dist/generated/xlsx_wasm_bg.wasm?url` and pass it to `initWasm(url)`;
  the package's own `new URL(..., import.meta.url)` default is not an asset Vite has emitted.
- **A `@font-face` family name must be the document's, not the substitute's.** Declaring
  `font-family: 'Liberation Sans'` helps nothing: the docx HTML says `Calibri` and a canvas says
  `16px Arial`, and neither ever sees it. Every alias rule names the document family and points at the
  substitute file, with `local()` first so a machine that owns the real font wins.
- **The PowerPoint engine takes font bytes, not CSS.** The tempting code is "fetch all 16 faces and
  register them" — 4.1 MB gzip for a deck that only uses Arial. Ask `handle.snapshot()` for the families
  the deck names, fetch only those, and register them with `registerFont` **after** `openPresentation`
  and **before** the first `layoutSlide`, or the first paint is measured with the wrong face.
- **`dist/_headers` is part of the build, not of the host.** COOP/COEP enable `SharedArrayBuffer` for
  the threaded WASM, and `font-src 'self'` is the promise that no font request ever leaves the origin.
  A static host that ignores `_headers` (or a preview URL that strips them) degrades both silently.
- **Vite resolves `url('/…')` in CSS against that project's `publicDir`.** The fonts are site-root
  assets, so a reader build whose `publicDir` is its own (empty, absent) folder warns "didn't resolve at
  build time" for all 16 faces and leaves the URLs alone. Every reader config now points `publicDir` at
  the repository's `public/` with `build.copyPublicDir: false`; only the hub, which builds into the site
  root, copies it.
- **A directory handle survives a reload; its permission does not.** `queryPermission` returns `prompt`
  or `denied` for a restored handle, and `requestPermission` only works inside a user gesture — calling
  it on mount is silently refused. Ask the cheap question on mount, render a Reconnect button, and let
  that click ask the real one.
- **`FileSystemDirectoryHandle.values()` is missing from this TypeScript's `lib.dom`.** It exists in
  Chromium, so the type is declared in `Lembaran/src/folders/store.ts` beside the picker declaration.
  Without it the listing has to go through `keys()`, which is not the same walk.
- **A Dexie table needs a `version()` block.** Adding `folders` to the existing `lembaran` database is
  `this.version(2).stores({ recent: …, folders: 'id, boundAt' })`; forget it and `db.folders` throws at
  runtime while types stay happy.
- **`--lb-paper` is the only white.** A new surface that wants "card background" takes
  `var(--lb-surface)`; reaching for `#fff` in the chrome undoes the palette. Only the sheet a document is
  drawn on — `surface.css`, the rail thumbnail, the Excel canvas — may use paper.
- **`zoom` on `#root` needs the viewport divided out.** Setting `zoom: 1.1` alone makes a `100dvh` root
  taller than the window and every fixed overlay too big; `width: calc(100vw / s); height: calc(100dvh / s)`
  beside it keeps the app inside the window at any scale. And a document inside the hub must **not** apply
  the scale again (`ownsScale()` in `appScale.ts` compares `window.top`), or 110% becomes 121%.
