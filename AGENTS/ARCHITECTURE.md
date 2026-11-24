# Architecture

Where a capability lands. The rules for working on it are in
[skills/lembaran/SKILL.md](skills/lembaran/SKILL.md); the standing conventions are in
[../.github/copilot-instructions.md](../.github/copilot-instructions.md). This page is the map.

## One rule

**A format owns its document; the framework owns the machine.** Everything a reader needs to exist
(file access, storage, worker messaging, theme, errors) is framework. Everything that decides what a
document looks like on screen is the format's, including its toolbar.

## Projects

| Path | Package | Owns | Must not |
| --- | --- | --- | --- |
| `Lembaran` | `@lembaran/framework` | `adapter/` contract, `files/` pick + hash, `opfs/` source store, `handles/` handle persistence, `licenses/` notice data | draw anything, import React, ship CSS, parse a document, know a format's name |
| `Lembaran.UI` | `@lembaran/ui` | reusable GUI: theme tokens, `ThemeProvider`, `useIsDesktop` / `useIsMobile` / `useIsFullscreen`; the general components in `src/components/` — `rail/` (`SidePanel`, `PanelItem`, `RailThumb`), `surface/` (`Surface`), `header/` (`Toolbar` + controls), `footer/` (`StatusBar` + items), `properties/` (`PropertiesPanel`) — and **the reader frames**: `shell/desktop/ReaderShell` and `shell/mobile/PhoneShell` (+ `mobile/phone.css`), sharing only `shell/Stage` | know what a document is, or draw one |
| `Lembaran.Pdf` | `@lembaran/pdf` | pdf.js adapter, page canvas + text layer, search, zoom | import another reader, touch IndexedDB directly |
| `Lembaran.Docs` | `@lembaran/docs` | docx-preview layout, page navigation, find with highlights | " |
| `Lembaran.Pptx` | `@lembaran/pptx` | BetterOffice PPTX adapter, slide canvas, thumbnail rail | " |
| `Lembaran.Excel` | `@lembaran/excel` | BetterOffice XLSX adapter, sheet tabs, viewport | " |
| `Lembaran.Csv` | `@lembaran/csv` | papaparse + virtualized grid | " |
| `Lembaran.App` | `@lembaran/app` | format selector, iframe host, OPFS handoff | import a reader at build time |

Import direction, one way only: `Lembaran.App` → `Lembaran.Pdf` → `Lembaran.UI` → `Lembaran`. Never the
reverse, and never reader → reader.

`Lembaran` is the platform and holds **no UI at all** — no React, no CSS, no component. Anything
reusable by another front-end (a theme, a device hook, a control with no product knowledge) belongs in
`Lembaran.UI`.

Chrome that draws no document is shared in `Lembaran.UI/src/components/`: the rail card and its lazy
thumbnail, the paper frame a page or slide is drawn into, the top bar, the status line, the inspector.
The engine still paints the document, and each format still owns its own controls, features and
document surface; two readers may look nothing alike. A component in `Lembaran.UI` may not know a
format's name or what its content means.

## A format is a vertical slice

A capability is one folder under `feature/` with its own store, actions and selectors. A pixel is in
`presentations/`, split into `layout/` (shells and the drawing surface), `component/` (composed pieces),
`library/` (primitives with no product knowledge), `ui/` (toolbars, dialogs) and `mobile/` (the phone's
own shell). `mobile/` is not a narrower `layout/`: it is its own `.tsx` with its own rules, and `App.tsx`
is the only file that picks between the two. Full rules:
[skills/lembaran/references/slices.md](skills/lembaran/references/slices.md).

```
Lembaran.Pdf/
├── index.html          standalone SPA entry
├── vite.config.ts      its own build → dist/pdf/
└── src/
    ├── main.tsx        boot: read the URL, render
    ├── App.tsx         desktop shell | mobile shell — the only place that picks
    ├── adapter.ts      ReaderAdapter, thin, mounts App
    ├── theme.ts
    ├── state/          the open document, current page
    ├── storage/        last page, zoom
    ├── feature/        one capability per folder
    │   ├── open/       index.ts · actions.ts · store.ts
    │   ├── paginate/   index.ts · store.ts · selectors.ts
    │   ├── zoom/
    │   └── search/
    └── presentations/
        ├── layout/PdfShell.tsx
        ├── layout/viewport/   PageCanvas, TextLayer
        ├── component/
        ├── library/
        ├── ui/PdfToolbar.tsx, OpenPrompt.tsx
        └── mobile/
```

`presentations/` is why the formats are separate projects. A PDF wants continuous scroll and a text
layer; a deck wants a slide strip and notes; a sheet wants tabs and a viewport; a CSV wants delimiter
controls. None of them wants the other's controls, so none of them shares the other's `ui/`.

## The contract

```ts
export interface ReaderAdapter {
  id: FormatId;
  extensions: string[];
  mimeTypes: string[];
  mount(el: HTMLElement, ctx: ReaderContext): Promise<ReaderInstance>;
}

export interface ReaderContext {
  source: DocumentSource;   // {kind:'opfs',path} | {kind:'handle',handle} | {kind:'bytes',bytes}
  fonts: FontProvider;      // self-hosted only
  theme: 'light' | 'dark' | 'system';
  files: FilesApi;
  onProgress(p: Progress): void;
}

export interface ReaderInstance {
  open(): Promise<void>;
  search?(q: string): Promise<SearchHit[]>;
  goTo?(t: ReaderTarget): Promise<void>;
  exportText?(): Promise<string>;
  destroy(): void;          // must dispose the engine handle
}
```

The contract is the seam that makes an engine swappable: `docx-preview` could replace BetterOffice in
`Lembaran.Docs/src/logic/` without the shell noticing.

## Storage, three layers

1. **`FileSystemFileHandle`** → IndexedDB (Dexie). Survives reloads; permission is re-requested on a
   user gesture.
2. **OPFS** (`opfs://<sha256>/source.bin`) → the bytes actually read, plus thumbnails and a text index.
   Written with `createSyncAccessHandle` in a worker.
3. **Cache API / service worker** → shell and content-hashed WASM, immutable.

The hub and a reader share an origin, so OPFS is the handoff: the hub writes an inbox file and posts a
path, never a blob.

## Worker boundary

Every engine runs in a worker behind Comlink. Bytes move as `Transferable`. The main thread composes.
A new capability that parses or lays out belongs on the worker side of the adapter, without exception.

## Where a new capability goes

| If it… | It belongs in |
| --- | --- |
| opens, stores or finds a file | `Lembaran/{files,handles,opfs}` |
| is a capability (zoom, paginate, search, notes, sheets, grid) | `Lembaran.<Format>/src/feature/<name>/` |
| is a control for reading a PDF | `Lembaran.Pdf/src/presentations/ui/` |
| draws the document surface | `Lembaran.<Format>/src/presentations/layout/viewport/` |
| is chrome every reader draws and no document content (a rail card, the paper frame, a bar, an inspector) | `Lembaran.UI/src/components/` |
| is a button or field that knows nothing about documents | `presentations/library/` |
| is a control only the phone gets | `presentations/mobile/` |
| parses document bytes | `Lembaran.<Format>/src/feature/<name>/` (worker side) |
| is shared by every reader and draws nothing | `Lembaran` |
| chooses which reader to open | `Lembaran.App/src/feature/choose/` |
| is a dependency at all | `AGENTS/FRAMEWORK.md` + `THIRD-PARTY-NOTICES.md` first |
