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
| `Lembaran` | `@lembaran/framework` | `adapter/` contract, `files/` pick + hash, `folders/` bind + list + permission, `opfs/` source store, `handles/` handle and bound-folder persistence, `licenses/` notice data | draw anything, import React, ship CSS, parse a document, know a format's name |
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
                            // planned: {kind:'cloud',provider,id,etag} — see § Cloud drives
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
   user gesture. The same table family holds the **bound folder**: one `FileSystemDirectoryHandle`
   under the key `bound`, so the hub can list that folder again in a later session.
2. **OPFS** (`opfs://<sha256>/source.bin`) → the bytes actually read, plus thumbnails and a text index.
   Written with `createSyncAccessHandle` in a worker.
3. **Cache API / service worker** → shell and content-hashed WASM, immutable.

The hub and a reader share an origin, so OPFS is the handoff: the hub writes an inbox file and posts a
path, never a blob.

A directory handle is the one thing the browser can take back between sessions: the record survives, the
permission does not. `folders/` therefore exposes `folderPermission` (never prompts) for the first look
and `ensureFolderPermission` (prompts, must run inside a click) for the Reconnect button, and the hub
renders those two answers as two different states. A bound folder is listed **recursively** — depth and
file count are bounded, and the row carries the path relative to the folder — while a browser with no
directory picker at all lists a one-off `<input webkitdirectory>` pick (subfolders included, via
`webkitRelativePath`) and says plainly that it is not remembered.

## The hub

`Lembaran.App` is a launcher and nothing else: it never imports a reader, it only iframes one. Its own
layout is split the way every other surface is — `presentations/layout/HubShell` (sticky bar, sections,
bound folder, readers, recents) and `presentations/mobile/HubMobileShell` (one column, three tabs) share
only `presentations/props.ts` and the `ReaderCard` component. The folder is likewise two files:
`layout/FolderLibrary.tsx` + `layout/FolderBrowser.tsx` on a desk, `mobile/MobileFolderList.tsx` +
`mobile/MobileFolderBrowser.tsx` on a phone. It browses one level at a time
(breadcrumb, folders first), shows ten rows and scrolls, and on a desk can be expanded into a dialog at 90% of
the window over a blurred, darkened page, where it can also flatten the whole tree into one "All files" list;
a phone needs no such dialog because the folder already owns a whole tab. The
palette comes from `Lembaran.UI/src/theme/tokens.css`: pastel green ground, a darker green for actions, clay
for marks, and one deliberate white, `--lb-paper`, which is the sheet a document is drawn on.

## Cloud drives (planned, not built)

Named by the user on 2026-11-24 for a later version: read a document straight out of a **OneDrive** or
**Google Drive** account, keep it in step with the copy in the drive while it is open, and — once a
format can edit — save back to where it came from. Nothing below exists yet; it is recorded so the
seam is not designed wrong first.

**The rule survives, the promise gets a caveat.** Lembaran still runs no server of its own: the only
endpoints a connected drive adds are the provider's own API origin. So the honest sentence becomes
"no file leaves the device **unless you connected a drive**, and then its bytes go only to that
provider", and `connect-src` in `_headers` grows exactly those origins instead of opening up.

**A drive is another `DocumentSource`, not another reader.** The File System Access API and a cloud
provider answer the same three questions — give me the bytes, tell me if they changed, take new bytes
back — so a cloud source is a second implementation of the seam that already exists, resolved by the
framework into an OPFS copy. Every reader and every engine keeps reading bytes and never learns a
provider exists.

```ts
// Lembaran/src/cloud/ — the shape, not the code
interface CloudProvider {
  id: 'onedrive' | 'gdrive';
  authorize(): Promise<CloudSession>;            // OAuth 2.0 + PKCE in a popup; no client secret in the app
  list(folderId: string): Promise<CloudEntry[]>; // id, name, size, mime, modified, etag
  read(id: string): Promise<{ bytes: Uint8Array; etag: string }>;
  changes?(cursor?: string): Promise<{ entries: CloudEntry[]; cursor: string }>; // Graph /delta, Drive changes.list
  write(id: string, bytes: Uint8Array, etag: string): Promise<{ etag: string }>;  // throws on conflict
  forget(session: CloudSession): Promise<void>;  // revoke the token, keep no trace
}
```

- **Read path.** `authorize → list → read → OPFS`, then the existing handoff: the hub writes the bytes
  and posts a path. A reader cannot tell a drive from a picked file, which is the point.
- **Change path.** No push channel is possible without a server, so a delta query per provider
  (`/delta`, `changes.list`) polled on a coarse interval while the tab is visible, plus a re-read on
  focus. A changed `etag` fetches new bytes into the same OPFS path and tells the reader to reopen.
- **Write path.** Only reachable once a format gains an edit step; the seam is
  `DocumentSource.write(bytes, etag)`. A `412`/`409` from the provider is a **conflict**, shown to the
  user — never an automatic overwrite of a newer remote copy.
- **Sessions.** Tokens live in IndexedDB beside the handle records, in memory otherwise; refresh token
  rotation is honoured, "disconnect" revokes and deletes. Nothing is ever stored server-side, because
  there is no server.
- **Where it goes.** `Lembaran/src/cloud/{providers,oauth,changes}/` is framework, beside `files/`,
  `handles/` and `opfs/`; the connect/pick UI belongs to the hub (`Lembaran.App/src/feature/…`); no
  reader imports a provider and no reader gains a "Cloud" button.

**Open decisions, deliberately unanswered** — these are questions for the version that builds it, not
for this page to guess:

| Question | Options on the table |
| --- | --- |
| Where the integrated file manager lives | a Lembaran-owned library (one recent list across local and both drives, staleness markers) **or** the provider's own picker iframed, with no local library of its own |
| Where a save lands | in place in the drive, with `etag` conflict handling pointed back into the provider's web UI **or** a local OPFS copy plus an explicit upload step |
| What "synced" means while open | a live re-read when the remote changes, **or** a badge that a newer remote copy exists and a Reload action |
| Offline | keep the cached OPFS copy readable and mark it stale, **or** refuse to open a cloud document offline at all |

## Worker boundary

Every engine runs in a worker behind Comlink. Bytes move as `Transferable`. The main thread composes.
A new capability that parses or lays out belongs on the worker side of the adapter, without exception.

## Where a new capability goes

| If it… | It belongs in |
| --- | --- |
| opens, stores or finds a file | `Lembaran/{files,handles,opfs}` |
| lets the user bind a folder, list it, or re-ask for permission | `Lembaran/src/folders/` — the UI state hook lives in `Lembaran.App/src/feature/folder/` |
| talks to a storage provider (OAuth, delta, write-back) | `Lembaran/src/cloud/`, behind the same `DocumentSource` seam — never inside a format |
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
