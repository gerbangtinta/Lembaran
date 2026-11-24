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

## Cloud drives (OneDrive built; Google Drive not started)

Named by the user on 2026-11-24, and **built for OneDrive** on 2026-11-25: a folder inside the account is bound
from the hub, its files open like any other, and the PDF reader saves the edits straight back into the drive.
Google Drive is deliberately out of scope — there is no provider registry to fill in and no dormant code for it;
`Lembaran/src/cloud/onedrive.ts` is a plain module, so a second drive would be a sibling file rather than a
refactor. The rest of this section is the design that was agreed *before* any of it was written, kept because it
is what the code follows.

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

**Open decisions, answered when OneDrive was built:**

| Question | Answer |
| --- | --- |
| Where the integrated file manager lives | **ours, in the hub.** One folder is bound at a time — a directory handle or a drive folder — and the drive is walked one level at a time (`DriveBrowser`-style rows) because a drive has no cheap recursive listing |
| Where a save lands | **in place in the drive**, with the eTag of the version that was opened sent as `If-Match`. A `412` is a conflict the user resolves: *Replace it* (read the current eTag, then write) or *Open theirs* (fetch, re-ingest, discard this window's edits). The drive's API has **no partial write**, so a save always sends the whole file: the reader therefore skips a save with nothing changed, fingerprints the baked bytes so an identical bake never leaves the device twice, and offers Compress for anything large. A PDF's own incremental-update trick cannot be used, because the transport would still need the entire object |
| What "synced" means while open | **nothing yet.** v1 checks the eTag on save; a `/delta` poll can come later without changing the seam |
| Offline | the OPFS copy keeps opening; a save fails with "sign in to OneDrive again" rather than writing anywhere else |
| Where the client id comes from | **the build ships one, and anything else overrides it.** `config.ts` carries `d7eca84d-…` so a visitor can connect a drive without registering an Entra app; `VITE_MS_CLIENT_ID` or an id typed into the hub (reachable from the sign-in card's *Use my own app registration*) wins over it. A client id is public — a single-page app has no secret to protect. One registration serves every user of the app; only the host registers anything. What actually protects the app is **not** the id: it is the exact-match redirect-URI allow-list (tokens only ever go to an address registered there), each user's own consent, MSAL's PKCE (S256) on the code, and delegated scopes that can only touch the signed-in person's files. The value that must never ship is a *client secret* — this app never creates one and Entra must not have one for it |
| Which tenant | `common` by default, so personal and work accounts both arrive. A registration limited to one organisation is unreachable through `common` (`unauthorized_client … not enabled for consumers`), so the hub takes a tenant beside the id (`rememberTenant` → `cloudTenant()`), and `VITE_MS_TENANT` pins one for a build |
| How long a sign-in lasts | the account, tokens and bound folder live in `localStorage`, so a reload, a new tab or a browser restart costs nothing. Microsoft's lifetimes then apply: **access token ≈ 1 hour**, renewed silently from the refresh token; **refresh token = 24 hours for a `spa` redirect URI**, fixed and not extendable. After 24 h one interactive step is required — a **top-level redirect** that normally returns without asking anything because the Microsoft cookie is reused. `loginPopup` is not used: its response page is a second copy of this app, which cannot read the interaction state MSAL keeps in the opener's `sessionStorage`, so the opener waits and the popup never closes (seen in Chromium). `loginRedirect` has no such seam; the page reloads, `handleRedirectPromise` takes the code, and `lembaran.onedrive.resuming` reopens the folder panel it was heading for. Switching accounts is done by signing out, which clears the cookie |

**What was built, file by file** — `Lembaran/src/cloud/`: `types.ts` (the refs, the entries, the five error
kinds), `config.ts` (the client id, tenant and redirect, primed by each app's entry because a workspace package
does not keep `import.meta.env`, plus the id a user types into the hub and keeps on the device), `oauth.ts` (the
only file that imports `@azure/msal-browser`, dynamically),
`onedrive.ts` (Graph: drives, paged listings, read, `If-Match` write, chunked upload sessions), `graph.ts` (the
pure mapping, paging and status rules), `entries.ts` (drive rows as `FolderFile`s, with `cloud` instead of
`handle`), `store.ts` (Dexie: the account and the bound drive folder), and `fake.ts`/`fakeGate.ts` (a development
drive behind `?drive=fake`, dropped from a build). The hub's `useBoundFolder` owns both sources; the reader only
learned one thing — `writePdf` writes back through the drive reference the recent record carries.

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
