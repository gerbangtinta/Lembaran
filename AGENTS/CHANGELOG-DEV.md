# Dev changelog

What moved, by date, newest first. Files, tests, gates and numbers live here; the user-facing record
is in [CHANGELOG.md](CHANGELOG.md). Never rewrite an older day — append, and reverse a decision with a
`Reverted:` line that keeps its reason.

Current version: `0.1.0-alpha`, named 2026-11-24. Nothing is built yet; this file starts with the decisions
that were made instead of code.

## 2026-11-25

- **"Upload a folder" where there is no File System Access** (copy). Firefox and iOS get `<input webkitdirectory>`, which
  is an upload-style pick, not a bindable handle — the card now says so: **Upload a folder** (heading and button) with
  *Choose another folder* → *Upload another folder* when one is already listed, while Chromium keeps **Bind a folder** /
  **This device**. The phone's folder tab follows the same two words. Verified in Chromium with
  `showDirectoryPicker` deleted at boot: heading and button read *Upload a folder*, OneDrive beside it; in the
  untouched browser the card still reads *Bind a folder · This device*.
- **A wait that looks like a wait, and Cancel beside Use** (UX). Connecting a drive fetches an 80 kB sign-in library,
  leaves for Microsoft and comes back, so the folder section could sit on a bare sentence long enough to read as
  "nothing happened". `Loading.tsx` is now a real panel — spinner (`hub-spin`, 0.72 s, halved for
  `prefers-reduced-motion`), `role="status"` + `aria-live="polite"`, a bold line and a hint — used for all three
  waits: *Reading the folder*, *Signing in to OneDrive* (with Cancel), and *Opening your drives*, which used to fall
  through to the stale card while `/me/drive` was answering. In the picker, Cancel moved out of the left edge and sits
  in a `.hub-picker-actions` group with **Use this folder** at the right; the account switch, when it is shown at the
  drive list, is the only thing on the left. Verified: the boot wait renders the panel with the animation running;
  with the MSAL chunk delayed, *Signing in to OneDrive* + Cancel is what the section shows; and in the picker Cancel
  (x=655) and Use (x=743) are adjacent at both the root and inside a drive.
- **The build ships a registration, so nobody has to create an Entra app** (decision made by the owner). `config.ts`
  now carries `SHIPPED_CLIENT_ID = d7eca84d-3ce5-4cbc-b018-cc567a88adc8`, and `cloudClientId()` is *build env → typed in
  the hub → shipped*. That makes `cloudConfigured()` true out of the box, so the folder card offers **OneDrive**
  instead of *Set up OneDrive*; the setup dialog stays reachable from the sign-in card as **Use my own app
  registration**, which is the self-hoster's escape hatch (their redirect URI would not be on this registration).
  Verified in Chromium with nothing stored: card reads `This device | OneDrive`, and clicking it navigates to
  `login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=d7eca84d-3ce5-4cbc-b018-cc567a88adc8
  &redirect_uri=http%3A%2F%2Flocalhost%3A5173%2F&response_type=code&code_challenge_method=S256`. **The registration
  must list every origin the app is served from** — `http://localhost:5173/` and `https://lembaran.pages.dev/` —
  because the allow-list, not the id's secrecy, is what keeps tokens where they belong. **Tests:** `config.test.ts`
  rewritten for the new precedence (37 framework tests).
- **A source label, and a way to reclaim what Lembaran stored** (feature + data hygiene). The folder heading now names
  where the folder comes from — **Local** or **OneDrive** (`presentations/sources.ts`, with `Google Drive` waiting for a
  provider registry) — while the breadcrumb underneath keeps the folder's own name, so "Engineering" is not repeated
  twice. Recent rows carry the same vocabulary: `OneDrive`, `Local` (a file with a handle) or **OPFS** (bytes that
  exist only in the copy Lembaran keeps in browser storage). Unbinding still deletes nothing but its own record — the
  folder on disk is untouched, and the OPFS copies stay so Recent can still open them — but a recent can now be
  cleared properly: `forget(id)` removes its OPFS copy, and a **Clear** button on the Recent section (desktop and
  phone, two-step like *Forget*) calls `clearRecent()` → `clearSources()`, emptying `lembaran/sources` with it.
  `removeSource` also stopped throwing when the file was already gone. Verified in Chromium against the fake drive:
  heading `OneDrive` with crumbs `OneDrive / OneDrive (sample)`; opening `hello.pdf` and returning showed
  `hello.pdf · OneDrive · Nov 25` and a **Clear** button beside the count.
- **The drive folder expands, and the account menu lost its button** (fix). The *Expand* icon was gated on `!onDrive`,
  so a OneDrive folder could not be opened in the big window at all; it is now shown whenever a folder is bound, and
  `FolderOverlay` takes an optional `drive` node that replaces its tree views — the drive panel brings its own
  breadcrumb, paging and walking, so the overlay's search field and Folders/All-files tabs are simply not rendered
  (they would have been inert; `hidden` alone did nothing, since the class rules set `display`). The `⋯` next to the
  account chip is gone: the chip itself answers a right-click (and Shift+F10) with the two account actions, with
  `cursor: context-menu` as the hint. Verified against the fake drive: header now reads `1 files · OneDrive · you@…
  · Expand · Choose another · Unbind` with no `⋯`; Expand opens a 1014×760 window titled `OneDrive (sample)` with the
  drive breadcrumb, `Reports` and `hello.pdf`, header holding only Close.
- **A save with nothing changed is skipped, and the bytes now say so** (perf/bytes). Writing always replaces the whole
  file — Graph has no partial update — so every Save used to bake and (on a drive) upload the identical file again.
  `saveNow` now returns early when `edits.dirty` is false ("Nothing to save — no changes since the file was last
  written."), and remembers a **SHA-256 of the last written bytes** (`digestOf`, first 12 bytes as hex) so an edit that
  bakes back to the same file ("Already saved — the edits came back to the same file.") also costs nothing; on an
  insecure origin without SubtleCrypto the digest is empty and the write happens as before. The Save dialog, for files
  of 4 MB or more, now says plainly that a save writes the whole file and offers **Compress first**, which reuses the
  Compress window. Verified through the hub's fake drive with `hello.pdf`: Save with no edits → dialog closes with that
  notice and nothing is written; rotate a page → Save → "Saved over the original: 2 KB" and the status bar echoes it.
- **The page switch lives only under the thumbnails now** (fix). With the rail closed, the bar still showed `‹ 1 of 19 ›`,
  which read as a second, competing control — the rail already carries it in its footer. `PdfToolbar` no longer renders
  `PageSwitch` at all (and lost the `numPages`/`onGoTo` props it only existed for); the rail footer is the one place,
  the mobile shell keeps `PageBox`, and the status bar still names the page. Reopening the rail is the toolbar's
  own *Show pages* button. `PageSwitch` is now referenced only by `ThumbnailRail` (verified by grep across the reader).
- **Only the drives a person actually uses are listed, and the account can be swapped** (fix + feature). A personal
  account's `/me/drives` answers with a pile of auxiliary "personal" drives — GUID-named ones, `Bundles_…`,
  `ODCMetadataArchive` — and the picker was showing all of them as if they were the person's OneDrive. `listDrives`
  now reads `/me/drive` for the default drive and adds only non-`personal` drives from `/me/drives` (document
  libraries and work drives), via the pure `primaryDrives()` rule (**3 tests**: the noise dropped, libraries kept
  default-first and deduped, a failed `/me/drive` still answering). The account line in the folder header grew
  **Add account** and **Remove**: removing calls the existing `signOut` (clears the session, the bound folder and the
  Microsoft cookie); adding calls `cloudSignIn({ chooseAccount: true })`, which is the same redirect with
  `prompt=select_account`, and releases the folder that belonged to the previous account — one account and one folder
  at a time, which is the whole model. The picker's footer carries the same switch as a button — *Sign in with
  another account* on the left, Cancel and **Use this folder** on the right — so switching never means closing the
  picker first. Verified against the fake drive: bound header shows `OneDrive · test.account@example.com` with both
  buttons; **Remove** returns the card with no chip; the footer's switch closes the picker and drops the account
  cleanly.
- **Choosing a OneDrive folder happens in its own window** (UX). Binding is a decision, but it used to look like the
  folder was already bound: the drive panel replaced the card in place, and the only way out was the icon that also
  means "unbind". `DrivePickerDialog.tsx` now puts the same panel in a modal — *"Choose the folder to bind"*, the
  drive list and breadcrumb, **Use this folder** where it was, and **Cancel** in the header (plus Escape and a click
  outside). `cancelDrivePicker()` closes it and reopens the bound folder if there was one; the card behind says
  *"Choosing a folder in OneDrive…"* so the two surfaces cannot disagree. The phone's folder tab uses the same
  dialog. Verified in Chromium against the fake drive: picker 792×302 labelled "Choose a OneDrive folder" with both
  sample drives; drive → folder → **Use this folder** closes it and shows the bound header with `Reports` and
  `hello.pdf`; reopening and **Cancel** closes it and restores the bound folder; the reload before that still had the
  binding and the `OneDrive · test.account@example.com` chip, so the persisted state and the panel agree.
- **Sign-in leaves the page and comes back, instead of opening a popup** (fix, found in Chromium). The popup never
  closed: the response lands on `redirectUri`, which is *this app*, and a second copy of an SPA cannot read the
  interaction state MSAL keeps in the opener's `sessionStorage` — so the opener waited on a popup that waited on the
  opener, until the 120 s watchdog said "timed out". `cloudSignIn` now calls `loginRedirect` (the flow Microsoft
  documents for SPAs, and the top-level frame its own refresh-token note asks for). Supporting that: `redirect.ts` +
  `signInResponseFrom` (pure, 3 tests) recognises a response URL without loading the library;
  `lembaran.onedrive.resuming` in `sessionStorage` survives the round trip and makes the folder store reopen the
  chooser it was heading for; `handleRedirectPromise` is reached on boot whenever a response is present (not only
  when a drive folder already exists) or the first sign-in would have been thrown away; a spent or failed response
  is stripped from the address bar (`settleSignInUrl`) so a reload cannot replay it; and `authMessage` now names
  `timed_out`/network and `access_denied` in plain words. Verified in Chromium: clicking OneDrive leaves the page for
  `login.microsoftonline.com/common/oauth2/v2.0/authorize?…client_id=…&redirect_uri=http%3A%2F%2Flocalhost%3A5173%
  2F…&response_type=code&code_challenge_method=S256`, i.e. a top-level navigation with PKCE; a bogus
  `/#code=…&state=…` returns to a working hub, the flag consumed and the URL cleaned to `/`, with no stuck
  "Signing in…" and no banner.
- **The sign-in is silent unless it truly cannot be** (fix). `cloudSignIn` passed `prompt: 'select_account'`, which
  forces Microsoft's account chooser on every interaction — the opposite of "stay signed in". It is gone: the popup
  now reuses the Microsoft session cookie and closes by itself, and switching accounts is done by signing out
  (which clears it). The lifetimes are now written down where the next reader will look (`ARCHITECTURE.md`,
  `LIMITATION.md`): access token ≈ 1 h renewed silently from the refresh token, refresh token **24 h for a `spa`
  redirect URI** and not extendable by activity — Microsoft's rule, since a SPA cannot rely on third-party cookies
  for a hidden frame. So a reload, a new tab or a browser restart costs nothing for a day; after a day there is one
  interactive step that normally needs no typing.
- **Hosting it for others is a static build with one inlined value** (docs/ops). `VITE_MS_CLIENT_ID` is
  build-time: `npm run build` inlines it as a string literal into `dist/assets/*.js` — proven by building with a
  marker and finding `clientId:\`deadbeef-…\`` in the hub's chunk *and* the PDF reader's — so a static host needs
  no server, no runtime env and no `.env` on the host. `.github/workflows/build.yml` now passes
  `VITE_MS_CLIENT_ID`/`VITE_MS_TENANT` from repository **variables** to `npm run gates` (unset ⇒ each visitor is
  offered *Set up OneDrive*, exactly as before). The setup dialog stops hard-coding `http://localhost:5173/`: it
  prints the address MSAL will really return to (`cloudConfig().redirectUri`, i.e. this deployment's URL) and, on a
  hosted copy, says that the id typed there applies to this browser only while the maintainer can set it once for
  everyone. `DEVNOTES.md § Deploy` gained the recipe; `.env.example` says the values are inlined.
- **The tenant is asked for beside the id** (feature, same round). `unauthorized_client … not enabled for
  consumers` is what `common` gets from a registration that excludes personal accounts, and the only way round it
  used to be `VITE_MS_TENANT` and a rebuild. The setup dialog now has a **Tenant (optional)** field
  (`rememberTenant`, `lembaran.onedrive.tenant`), `cloudTenant()` = typed tenant → build tenant → `common`, and the
  MSAL instance is keyed on `id|authority` so changing either rebuilds it. `authMessage` translates the two errors
  people actually hit instead of relaying Microsoft's text: *not enabled for consumers* → say to set the Manifest
  `signInAudience` to `AzureADandPersonalMicrosoftAccount` or enter the tenant, and `AADSTS9002326` → the redirect
  URI belongs under **Single-page application**, not *Web*. The dialog's own copy answers the question the error
  raises: **one registration serves everyone who uses a copy of the app** — each person signs in to it with their
  own account, and only the host has to register anything. Verified: both values land in `localStorage`; a
  Build-id-vs-typed-id and tenant precedence suite (**5 tests**, `config.test.ts`).
- **The client id can be typed into the hub** (feature, the missing piece of the round below). A build that
  shipped without `VITE_MS_CLIENT_ID` used to show a dead disabled "OneDrive" chip — and since `.env.local` was
  never created and no app registration existed, that is exactly what the first real run hit. The folder card now
  reads **Set up OneDrive** when nothing is configured: it opens `OneDriveSetup.tsx`, which lists the five
  registration steps (new app registration, **Single-page application** platform, the `http://localhost:5173/`
  redirect in development plus the https one, delegated `Files.ReadWrite` + `User.Read`, copy the *application
  (client) id*), takes the id, and stores it with `rememberClientId` under `lembaran.onedrive.clientId` in
  `localStorage` — then goes straight on to sign in. `cloudClientId()` is now *build id, else stored id*, and
  `cloudConfigured()` keeps the fake drive working. The phone's folder tab got the same two buttons; it also
  learned the drive states it never rendered (`drive-signing-in`, `drive-signed-out`, `drive-expired`) and shows
  the panel itself when a drive is open. **Bug found while testing:** `loginPopup` settles only when its window
  closes, so a popup that the browser blocked or that a user left open froze the section on "Signing in to
  OneDrive…" forever — the wait is now bounded (`SIGN_IN_LIMIT` 120 s) and a **Cancel** button rejects it at once,
  landing on "Sign-in was cancelled." with the card back. Verified in Chromium: no id → `This device | Set up
  OneDrive`; dialog 616×542 with the id box 546 px wide and no vertical overflow; Save disabled until an id is
  typed; the id lands in `localStorage`, the dialog closes, the card flips to `OneDrive`; a reload keeps it; Cancel
  during a hung popup returns the card with the message and no stray "Forget the drive"; deleting the override
  brings "Set up OneDrive" back.
- **OneDrive is a folder you can bind** (feature, the cloud chunk). The hub's bind card asks **This device |
  OneDrive**; choosing OneDrive signs in with a popup, lists the account's drives (personal, work, SharePoint
  document libraries), steps into folders one level at a time, and **Use this folder** binds it. From there the
  rows are the same as a local folder's, and opening one copies its bytes into OPFS exactly like a picked file —
  the reader still reads a path and knows nothing about a drive. **Saving goes back where it came from**:
  `writePdf` finds a drive reference on the recent record instead of a file handle, `If-Match`es the eTag the file
  was opened at, and a `412` stops the save with a choice — *Replace it* (re-read the current eTag, then write) or
  *Open theirs* (fetch, re-ingest, discard this window's edits). **Framework** (`Lembaran/src/cloud/`):
  `types.ts`, `config.ts` (client id, tenant, redirect, primed by each app's `main.tsx` because a workspace package
  does not keep `import.meta.env` — the first bug found, and it read as "OneDrive is disabled"), `oauth.ts` (the
  only importer of `@azure/msal-browser`, dynamically, so nothing in the hub's first payload changed),
  `onedrive.ts` (Graph: drives, paged listings capped at 300, read, write, upload sessions above 4 MB in 10 MiB
  chunks), `graph.ts` (pure mapping/paging/status rules), `entries.ts` (`CloudEntry → FolderFile` with `cloud`
  instead of `handle`), `store.ts` (Dexie v3: the account and the bound drive folder), and `fake.ts` (`?drive=fake`,
  a drive in memory, gone from a build — `import.meta.env.DEV` in `fakeGate` removes the chunk). Hub:
  `useBoundFolder` owns both sources, `DriveFolder.tsx` is the drive panel, `FolderLibrary` asks where a folder
  lives before it opens a picker, and the badge reads `OneDrive · account`. CSP grew exactly
  `login.microsoftonline.com`, `graph.microsoft.com`, `*.sharepoint.com`; `.env.example` documents the Entra app
  registration (SPA platform, `Files.ReadWrite`). **Traps:** the fake flag was read with
  `URLSearchParams.has('drive=fake')` — `has` takes a key, so it was always false; and `cloudConfigured()` first
  read `import.meta.env` inside the framework, which a pre-bundled workspace package does not carry. Verified in
  Chromium against the fake drive: bind → drive list → root (Reports + hello.pdf, `notes.txt` filtered) → bound
  header and count → open (iframe URL carries `drive=fake`, 2 pages) → edit → **Save over it** wrote and moved the
  fake version v1 → v2 with "Saved over hello.pdf"; a staged version bump made the next save show the conflict
  (nothing written), **Replace it** wrote v3 → v4 with "Replaced the copy in OneDrive", and **Open theirs** reopened
  the drive copy with the edits discarded; a fresh load restored the bound drive folder without a sign-in.
  **23 framework tests** (17 new: item mapping, page merge and cap, chunk maths, status → error kind, drive rows).
  MSAL measures 316.97 kB → **81.44 kB gzip** as its own lazy chunk, recorded in `FRAMEWORK.md`.
- **Save and Compress are two features, not one dialog with checkboxes** (split). **Save** asks every time and then
  writes: no options in the way. `Ctrl+S` opens the same question. `savePdf` became `bakePdf` (record → the file's
  own bytes) and `writePdf` (bytes → the file, or a copy when it cannot be written), with `canOverwrite(path)` so
  the confirm can say "Save over it" or "Save a copy" *before* the button is pressed instead of finding out after.
  Nothing is re-compressed on that path: the bytes are the edits, baked. **Compress** has its own window and its own
  button, and three ways in: Low/Medium/High presets (`COMPRESS_PRESETS`), **fit a final size** (a KB target walked
  down `TARGET_LADDER` from the best-looking pass to the smallest by `fitToSize`, which stops at the first pass that
  fits), or every dial by hand — with the two weights kept apart, photos (`compressImages(bytes, quality, maxEdge)`)
  and the structure that carries text and vectors (`rewriteStructure`). "Check the size" reports before → after, the
  share saved, and how many photos were rewritten; a target that cannot be met says what it reached and why (the
  document's own text and lines are never rasterised, so that is the floor). The save writes over the original by
  default and a copy on request. Verified in Chromium with a 212 KB sample holding one 215 KB photo: Medium 212 →
  111 KB (−48%, 1 photo rewritten), a 40 KB target reached 33 KB at 35% / 800 px, an impossible 2 KB target answered
  "the smallest it would go is 33 KB", **Save** wrote 212 KB through the picker and reported it on the status line,
  **Save compressed** wrote 113,439 bytes which reopened as a valid 2-page PDF with both text runs still text.
  `fitToSize` is tested with a fake compressor (3 tests: the first fit wins, a miss says so, and the ladder only
  ever gets stronger) — **45 PDF tests**.
- **The thumbnail menu is a popup over the page, not a row in the rail** (fix). It was rendered as a child of
  `SidePanel` with `position: sticky`, so opening it took a slot in the rail's flex column and pushed every card
  below it down. It is now portalled to `document.body` and `position: fixed` at the pointer, clamped inside the
  window by a `useLayoutEffect` that measures it after mount, and it closes on scroll and resize because a fixed
  menu would otherwise stay behind while the card it belongs to scrolls away. The 44 px it had per row was the
  global `button { min-height: var(--lb-tap) }` — a finger size — so the rows are 28 px now and the whole menu is
  172 × 153 instead of 172 × 217. Verified in Chromium at 1200 × 760: card tops 59/151 before and after opening,
  rail `scrollHeight === clientHeight` (nothing added to the column), menu `position: fixed`, parent `BODY`, inside
  the viewport, Rotate right turned the slot 420 × 595 → 595 × 420 and closed it, Escape closed it, an outside click
  closed it with `getSelection()` empty, and a rail scroll closed it.
- **Stamp rows are dragged into order, the mark can look pressed, and the preview has its own window** (feature
  round). **Rows, not lines:** each row begins with a grip (`⠿`) at the left, and the row is dragged onto the row
  it should take the place of (`moveStampLineTo`, which reuses the tested delta move); the grip also answers
  ArrowUp/ArrowDown when focused, so the order is reachable without a mouse. The ↑/↓ buttons are gone and every
  label says *row*. **A stamp can look pressed:** `StampDesign.finish` is `perfect`, `natural` or `worn` (plus the
  `seed` the hand-made marks come from). `paintStamp(canvas, design, scale, seed)` now draws the frame and the rows
  through one `drawPass` — at wobble 0 it is the exact print it always was — and for the other finishes adds a
  whole-mark rotation of up to ±1.5°, a corner jitter on the frame, a per-row offset, and a second, fainter
  impression, the way a rubber stamp lays ink twice; `season()` then grains the canvas's own pixels with smooth
  value noise (`feature/stamp/noise.ts`: mulberry32 `seededRandom` and a bilinear-smoothstep `valueNoise`) and, for
  `worn`, speckle where the rubber is dry. The preview draws from `design.seed`, so it does not shimmer while you
  type; `renderStamp(design, fresh = true)` mixes a fresh seed per placement, because no two presses match —
  measured in Chromium: two *natural* placements stored different PNG hashes, two *perfect* ones stored the same,
  and the same design's preview was byte-identical across a finish round-trip. **A window of its own:** the preview
  is `.pdf-stamp-preview` at a fixed 320 px around a fixed 220 px `.pdf-stamp-stage`, and the canvas is fitted from
  both sides, so a long row shrinks the mark (294 × 23 measured) instead of widening the dialog; eleven rows scroll
  the panel (which already had `max-height: 88vh`) instead of stretching it. **The pen could not be put down:**
  `D` was printed on its button but no shortcut handled it, there was no confirm, and Escape — the one key everyone
  reaches for — never arrived: Chrome marks Escape's keydown as already used while a pointer gesture is in flight,
  and `useShortcuts` returned on `defaultPrevented` before it looked at the key. Escape is handled before that guard
  now, `Enter` and a `Done` chip in the bar finish the armed tool, and `closeOverlays` clears the highlight tool
  (`annotations.setTool('none')`) — the dead `editTool === 'highlight'` sync effect is deleted, because it fought
  the annotate button whenever `annotations.setTool` changed identity, which is why `H` sometimes did nothing.
  Verified in Chromium at 1200 × 760: grip at x = 239 with the field at 261, dragging row 3 onto row 1 reordered it,
  ArrowUp on the last grip moved it, `H` → Escape, `D` → Done, and `D` → Enter all put the tool down, and the
  status line names the armed tool. `42 PDF tests` (7 new).
- **The page switch moved under the thumbnails** (layout). `‹ 1 of 2 ›` sat on the top bar, away from the pages it
  moves through. It is now the rail's footer: `SidePanel` takes an optional `footer`, `.lb-panel-foot` sticks to
  the bottom of the rail (and is pushed there even when the cards are few), and `ThumbnailRail` passes a compact
  `PageSwitch` — new `presentations/ui/PageSwitch.tsx`, which also owns `PageBox` now that the mobile header and
  the bar both use it. The bar keeps the switch **only while the rail is hidden**, so closing the rail cannot take
  navigation away. Traps: the footer is sticky rather than positioned, because the rail is its own scroll
  container — with `margin-top: auto` it is at the bottom whether the cards fill the rail or not, and
  `margin-right/-bottom: -8px` cancels the rail's padding so its rule reaches the edges; the compact seg is a size
  down (28 px buttons, 4ch box) because 168 px of rail minus the scrollbar gutter leaves 141 px. Verified in
  Chromium at 1200 × 760: no `Navigation` group in `.pdf-topbar` while the rail is open; the footer measured
  157 × 45 at the rail's bottom and stayed at y = 693 with the rail scrolled 276 px; Next took page 2 and typing 1
  returned to page 1 with the card's `aria-current` following; with the rail hidden the switch came back to the
  bar at x = 228 in the same 51 px row, moved to page 2, and returned to the footer when the rail reopened.
- **Find marks its hits, a note takes Delete, and a blank page can be deleted** (bug round, four reports plus
  follow-ups). **Find:** search already returned `1/2`, but the box reopened holding the old term with nothing
  marked, so it looked broken. `SearchBox` selects its text on open, and the query travels down
  `PdfShell`/`PdfMobileShell` â†’ `PdfViewport` â†’ `PageSlot` â€” `PageCanvas` draws `.pdf-search-mark` over every run
  whose text contains the needle. Closing the box now **clears** the query and the hits (`closeSearch()`), which
  removes the marks instead of leaving them behind. **Delete:** the handler that removes a picked item never
  looked at annotations, so Delete did nothing on a highlight. It now removes the picked item, else the picked
  note, and skips the key whenever a field or `contenteditable` has the focus so a note's own typing is untouched.
  A note that is still **empty** drops its highlight on Delete/Backspace from the textarea itself â€” the card
  autofocuses that field, so otherwise the key was swallowed and the highlight could only be removed from the
  card's button. Note text is also written on unmount (refs, not the closing render's state) so closing the card
  cannot lose the last keystrokes. **Blank pages:** the rail and the page menu both act on a **display** index, but
  a blank slot has no source page, so deleting one fell through to `removePage` with a null source. `DisplayPage`
  gained `blankId`, the model `removeBlank`, the store `removeBlankPage`, and `App.deleteAt` picks the right one;
  `canDeletePage` keeps the last page. **The rail menu** lost its "Close" row (the card closes with a click
  anywhere else), and that dismissal is swallowed: `Menu.tsx` and `ThumbnailRail.tsx` listen for **click** in the
  capture phase and call `preventDefault` + `stopPropagation`, so the press that closes a menu neither selects
  page text nor opens the note under the pointer. Traps: `MenuItem` passed the click **event** as its argument, so
  `insertBlankPage(event)` inserted at a non-number index (front of the document) â€” the handler now calls
  `onSelect()` with no argument; and the dismissal cannot be done on `pointerdown`, because React removes that
  listener when the menu closes, before the click of the same gesture arrives, which is exactly how the click got
  through and reopened a note. Navigation by page box also snapped back: `offsetForPage` used an 8 px margin while
  `pageAtOffset` allowed 8 px of slack, so a freshly scrolled page fell outside its own band â€” the margin is 8 and
  a round-trip test pins it. **White backing:** a placed text box may now ask for one (`TextItem.background:
  'white'`, a "White background" checkbox in the dialog); `bake` draws the same patch as a replacement, and the
  frame shows it, while a replacement is always forced, since it has to hide the run it covers. Verified in
  Chromium: search `1/2` with 2 marks and 0 after close, box empty on reopen; Delete on an empty note took the
  highlight from 3 to 2 and held after a reload; the rail menu has four rows and an outside click left
  `getSelection()` empty, 0 notes open; the blank inserted at display 2 and deleted from the page menu;
  "White backing" stored `{ kind: 'text', background: 'white' }` and rendered `has-cover`. `npm run gates` exits 0
  (**34 PDF tests**).
- **A stamp is composed, not just picked** (feature). The stamp tab is a builder: the usual lines (heading, name,
  position, organisation, date or reference) plus "+ Add a line", each with **bold** and Small/Medium/Large,
  inside a **paper stamp** frame (double or single rule, four inks, capitals) or a clean **digital** frame, with
  alignment; a live preview draws the stamp as it is typed. The design is kept with the preset (`StampDesign` on
  `SignaturePreset`), so a saved stamp reopens in the form (`✎` on its tile) and updates in place — `savePreset`
  now takes an optional `id` — and picking it re-renders from the settings, so the picture is never stale. Any
  line left empty is not drawn, and a multiline entry is split into its own lines. The stock words are one-line
  designs and are not saved. A stamp's **size is in points**, and the page places it at that size
  (`PresetPick.widthPoints` ÷ the page's own width in `App`) rather than at a guessed share of the page, so 19 pt
  text is 19 pt on the paper. Bytes are drawn at 4× into a transparent PNG — a raster picture in the file, sharp
  at print size but not vector text. Traps: the canvas resolution must not decide the physical size (hence points
  in `stampLayout` and a scale used only for pixels), and line ids are made when a line is created so React keys
  stay put when one is removed. Verified in Chromium: the builder is 760 px wide with five line rows; the preview
  grew 189 × 83 → 246 × 178 as the lines were filled; the placed stamp measured 246 × 178 px at 100 % on a 420 pt
  page (its designed width); the preset stored `design` with all five lines; `✎` loaded them back; **Save and
  place** updated the same id after the position was changed; the paper and digital renders carry `#b03a2e` /
  `#17251b` ink and a frame in the pixels. **6 tests** for `stampLayout`, `stampLabel` and the stock design.
- **A highlight opens its note again, and the toolbar is one row** (fix + layout round). **The note:** every
  highlight was drawn twice — once by `AnnotationLayer` (the button that selects it and mounts the note card) and
  once by `EditLayer` as an inert span, which had `z-index: 3` over the button and `pointer-events: auto`, so it
  took the click and nothing happened; the second copy also darkened the tint and re-drew baked highlights after
  a save. `EditLayer` no longer draws highlights at all: the annotation layer is their one owner, and the bake
  still reads them from the notes table. **The bar:** 21 controls wrapped onto a second row at 808 px, which put
  the page box over the 168 px rail column (reported as the page count appearing "within the thumbnail area").
  Rotation went back into the page menu, the four insert tools (text box, edit text, picture, signature/stamp)
  went into an `insert` menu with labels, and the highlight swatches became a palette that hangs below their
  button instead of widening the bar. New `presentations/ui/Menu.tsx` (`MenuButton`, `MenuItem`, outside-click and
  Escape close, a ✓ on a mode that is on) is shared with `PageMenu`. 16 controls, one 51 px row at 808 px, nav at
  x = 228 — right of the rail. Verified in Chromium at 808 × 700: the note card opens on a highlight click and
  keeps typed text; the insert menu lists the four items and places a text box; the page menu lists rotate
  left/right, insert blank and delete; the palette shows four swatches without changing the bar's width.
  `npm run gates` exits 0 (26 PDF tests).
- **Placed items get handles, a text box opens again, the page's own text can be replaced, and signatures and
  stamps have a shelf** (feature round on the edit milestone).
  **The text field that ate words:** `TextDialog`'s effect depended on `text`, so every keystroke re-ran
  `field.select()`; the next character replaced the selection, and "typed words" arrived as `s`. Focus and select
  happen once now, in their own mount effect. The same dialog serves three modes (`new`, `placed`, `run`).
  **Items are editable:** `EditLayer` draws a text or picture as a `.pdf-edit-item` frame — drag the frame to move,
  drag a corner to resize (pictures keep their shape, text boxes do not), `×` or `Delete` removes it. A gesture
  writes one history state on pointer-up, and a click that moved nothing writes none. Items are the only
  interactive thing in the layer and only while no tool is armed (`is-idle`), so drawing, highlighting and the
  page's text selection are untouched. Double-clicking a box reopens the text dialog and updates it in place.
  **Replacing the page's own text:** `TextPiece` gained `box` (normalised, measured on the scale-1 viewport with the
  page's turn applied) and `points`; `PageCanvas` paints a `.pdf-run-layer` of those boxes in `textEdit` mode and a
  click opens the dialog prefilled with the run. The replacement is a `text` item with `replaced` set; `bake`
  draws a white rectangle over the box before the words, and the frame paints the same white on screen, so
  moving or resizing the box moves the patch with it. An empty replacement erases the run. Trap recorded: the
  transform's axes already carry the font size, so multiplying them by `points` again produced a page-sized
  cover — the axes are divided by `points` first, which also makes a quarter-turned run's box (28 × 169, not
  169 × 28) correct. The invisible spans could not be the click targets: on a rotated page two runs overlap.
  **Wrapping:** `drawText` breaks lines at spaces to the item's width (`wrapLine`, **2 tests**), matching the box
  on screen, which no longer clips its text.
  **The shelf:** the edit database went to **v2** with a `presets` table (`listPresets`, `savePreset`,
  `deletePreset`); a drawn or uploaded signature is kept automatically, and the dialog has `Signature` / `Stamp`
  tabs, a grid of saved pictures, `×` per preset, five stock stamps (APPROVED, REVIEWED, DRAFT, PAID, VOID) and a
  field that turns a word into a stamp (a bordered PNG on a transparent ground) and keeps it. A placed picture is
  copied into its own blob, so deleting a preset cannot break a document that used it.
  **Placing where you click:** choosing a picture stores it and arms the page (`EditTool 'place'`); the next click
  drops it centred there with its own aspect (page width ÷ height taken into account), selects it for moving, and
  the status bar says so; Escape cancels. The toolbar gained **Edit text already in the page (E)** and the
  `editText` icon. Verified in Chromium: typing kept the whole string; a box moved by exactly 50 px and resized by
  60 px, one Undo restored it and one Redo re-applied it; a run replacement's patch measured `169 × 28` at the run
  box and `30 × 169` on a quarter-turned page; a saved signature reappeared in the shelf and placed again; a stock
  stamp and a saved custom stamp both landed; the baked copy of a replaced run extracts `Hi Lembaran` as real text.
  `npm run gates` exits 0 (26 PDF tests).
- **The view catches up with the record: strokes, turned pages, blanks, zoom, text and undo** (fix round on the
  same milestone). Six bugs, all in how the edit round *drew* what it had recorded — the bytes were right.
  **Ink:** a stored stroke was drawn with `vector-effect: non-scaling-stroke` and `stroke-width: 0.005` (from
  `item.width / 400`), which is 0.005 of a CSS pixel, so the line disappeared the moment the pointer came up while
  the in-progress preview (no `vector-effect`) looked correct. `EditLayer` now takes the page's `scale` and draws
  `item.width * scale` non-scaling, and the preview uses the same rule. **Turned pages:** the slot was sized from
  the page's own paper (`box.width`) while pdf.js drew the turned viewport (`box.height` wide), and the shared
  `.lb-surface > canvas { max-width: 100% }` then squeezed that canvas into the narrow slot — a 90° A4 page came
  out `420 × 420`. `displayBox(page, source)` in `feature/edit/model.ts` returns the paper a display position
  shows (turned with the page, or the blank's own size) and **3 tests** cover it; `PdfViewport` sizes a slot and
  answers `pageBox()`/`fitWidth()` from it. **Zoom past the window:** `.pdf-slot { max-width: 100% }` and the same
  canvas rule clamped every page to the reader's width while the height kept growing, so 400% drew a 1680 px page
  as 799 px of stretched pixels; `.pdf-pages` is `align-items: flex-start` with `.pdf-slot { margin-inline: auto }`,
  which keeps a fitting page centred and lets a larger one overflow and scroll, and `.pdf-page > canvas` has
  `max-width: none`. **Blank pages:** the blank's `Surface` held only a clipped span, so `width: fit-content`
  collapsed the sheet to `0 × 0` — the *slot* was paper-sized (which is what was measured last round) and the
  page itself was invisible; `.pdf-page-blank` is `width/height: 100%`. **Text:** a placed box drew at `size` CSS
  px at any zoom, so it shrank against the page as the reader zoomed and no longer matched the `size` points baked
  into the file; it draws `size * scale` now, like ink. **Undo:** `usePdfEdits` pushed history *inside* the
  `setState` updater, which StrictMode invokes twice, so every edit left a duplicate state and Undo worked on the
  first press then looked dead; history moves outside the updater and every mutator reads a state ref, so two
  commits in one tick compose. **Pictures:** the edit layer revoked every object URL whenever `items` changed,
  breaking pictures already on the page (`ERR_FILE_NOT_FOUND` in the console) and re-reading them; one URL is made
  per blob and revoked with the page. Smaller: the rail's `Insert blank after` ignored the card it was opened on
  and inserted after the current page (`onInsertBlankPage(display?)`), the phone's page box counted `doc.numPages`
  instead of the edited sequence, and Undo/Redo wore the prev/next chevrons — `undo`/`redo` icons were added to
  the shared set. Verified in Chromium: a committed stroke computes `2px` (`6px` at 300%), a quarter-turned page
  is `595 × 420` with a canvas of the same size, a blank sheet measures `595 × 420` and its rail card `118 × 83`,
  300% draws a `1780px` slot that scrolls, `24 px` text draws at `72 px`, one Undo removes exactly one item, and
  placing a signature leaves the older picture loaded with no console error. `npm run gates` exits 0 (23 PDF tests).
- **The PDF reader can write: page tools, placed items, save and compression** (feature, desktop first).
  `pdf-lib` 1.17.1 (MIT) joined `Lembaran.Pdf`; it is the only writer, and it is loaded with the reader, not the
  hub (bundle 804.6 kB -> 1244.6 kB raw, 245.8 -> 426.9 kB gzip).
  `storage/edits.ts` opens database `lembaran-pdf-edits` (tables `edits`, `blobs`); `feature/edit/` holds the
  record (`usePdfEdits`: plan + items, undo/redo as whole states, a dirty flag, a 300 ms write) and the pure
  model (`displayPages`, `displayToSource`, `sourceToDisplay`, `deleteSourcePage`, `rotateSourcePage`,
  `insertBlank`, `rotateBy`) with **7 tests**. `PdfViewport` and `ThumbnailRail` now draw a **display list**
  instead of `1..numPages`, so a deleted page is absent, a rotated page renders with pdf.js's own rotation and a
  blank page is a `Surface`. The toolbar gained a **page menu** (rotate left/right, insert blank after, delete)
  and a **save button** with a dirty dot; the `Place` segment holds ink, text and image tools, and
  `EditLayer` draws what they produce (ink as a polyline, text as a positioned box, images from IndexedDB
  blobs) plus the highlights that still live in the notes table.
  `feature/save/bake.ts` replays the record with pdf-lib: pages in order, a rotated page rebuilt as a page of
  the swapped size with the old one drawn inside it (so `/Rotate` stays 0 and normalised boxes mean one thing),
  blanks at their index, then highlights, ink, images and text in display coordinates.
  `feature/save/save.ts` writes the bytes **over the original file** through the handle the recents table kept
  (`recentByPath`, new `ensureWritePermission` in the framework), re-ingests the saved bytes to OPFS, repoints
  the recent row, re-keys the notes to the new document key (`rekeyAnnotations`, marked `baked` so the overlay
  stops drawing them), clears the record and reloads the viewer; with no handle it falls back to
  `saveBytesAs` and says it saved a copy.
  `feature/compress/` adds the two passes the Save dialog offers ? `rewriteStructure` (lossless: fresh document,
  object streams) and `compressImages` (DCTDecode XObjects only: decode, shrink past 1600 px, re-encode as JPEG,
  never grow; CMYK/masked/JPX streams are counted as skipped) ? and **text is never rasterised**.
  Traps recorded: a hook placed below an early return unmounted the reader; `Omit` on a union lost every
  variant's own fields (fixed with a distributive `NewEditItem`); `embedPage` refuses a page with no contents.
  Verified in Chromium against `samples/hello.pdf` seeded into OPFS with a real handle: the page menu reported
  `[Rotate left, Rotate right, Insert blank after, Delete page]`; rotate turned page 1's canvas `420x595 ->
  595x420` and its rail card `118x167 -> 118x83`; insert blank gave 3 slots with one `data-blank`; delete went
  back to 2; Save (overwrite + structure) answered "Saved over the original: 1 KB." and the reloaded document
  drew page 1 at `595x420` ? the rotation was in the bytes; a text box and an ink stroke placed through the
  tools persisted as `items: [text, ink(3 points)]` and marked the button "Save PDF, edited". `pdf-lib` row
  added to `FRAMEWORK.md`, notices regenerated (14 dependencies), `licenses:check` passed for 10.
- **Undo/redo, page tools on the bar, fit toggle, rail menu and reorder, and a signature pad** (UI round on the
  same milestone). `usePdfEdits` gained `movePage` (a splice of `order`) and `insertBlankPage(at, size)`;
  `PdfViewport` measures every page's paper once (`getViewport({scale:1, rotation:0})`) so a slot's placeholder,
  a blank page and the rendered page agree ? the hard-coded `PAGE_ASPECT` was why a non-A4 page looked stretched ?
  and its API grew `fitHeight()` and `pageBox(display)`. The toolbar now carries **Undo / Redo** (`Ctrl+Z`,
  `Ctrl+Shift+Z`, `Ctrl+Y`), **rotate left/right as their own icons**, and the fit control left the zoom segment
  to become a width/height toggle. `ThumbnailRail` cards are draggable (drop writes the new order) and answer a
  right-click with rotate / insert blank / delete. The image tool opens the picker from the icon and drops the
  picture on the current page. The edit layer is inert (`pointer-events: none`) unless a tool is active, so it no
  longer eats text selection, and a one-point tap becomes a dot instead of nothing ? the "cannot draw" report.
  `SignatureDialog` combines signature and stamp: draw on a pad (transparent PNG via `toBlob`) or upload a file,
  and it is stored as an `image` item with `role: 'signature'`, so it places, moves and bakes through the path
  that already existed. Verified in Chromium: rotate via the bar `420x420 -> 420x595`, Undo `-> 420x420`, Redo
  `-> 420x595`; rail menu `[Rotate left, Rotate right, Insert blank after, Delete page, Close]`; a blank page
  measured the same paper as the page it followed; a drawn signature placed one image item and stored
  `{kind: image, role: signature}` with a 2.3 kB PNG.
- **Not built yet, recorded so it is not assumed**: editing text that is already in the page (the plan's
  cover-and-replace patch, then the `Tj`/`TJ` spike), resizing or moving a placed item with handles, an undo
  control in the UI (the store has the history), and the same tools on the phone. Each is listed in
  [LIMITATION.md](LIMITATION.md).

## 2026-11-24

- **Pastel green becomes the palette, the hub becomes an app, and a folder can be bound for good** (UI
  feature + new capability). `tokens.css` now carries two palettes only — pastel green (default) and a
  green-charcoal dark — built from one green that acts (`--lb-accent` #2c6a43), one clay that marks
  (`--lb-accent-2` #b06a4a) and green-tinted surfaces, so no chrome colour is `#fff`. The single white
  left is `--lb-paper`, documented as "the sheet a document is drawn on" and used by `surface.css`, the
  rail thumbnail and the Excel canvas; `pdf.css`/`excel.css`/`rail.css` lost their literal `#fff`. The
  retired warm `light` theme is folded into pastel (`normalisePreference`), so `THEME_ORDER` is
  `['pastel','dark']` and a stored `light` still resolves. Shared control classes (`lb-primary`,
  `lb-ghost`, `lb-marker`, `lb-chip`, `lb-label`, `lb-field`) were added to `tokens.css` so the hub and
  every reader toolbar share one vocabulary.
  The hub is now a sticky bar (brand + version chip, search over readers and files, bind-folder button,
  theme toggle) over three sections in a fixed order — Folder, Readers, Recent — with a `ReaderCard`
  that puts the extension in a chip and the only filled button on the card. `HubShell` and
  `HubMobileShell` were rewritten as separate files with rewritten stylesheets (`hub.css`,
  `mobile/hub-phone.css`); the phone got tabs (`Readers` / `Folder · n` / `Recent`) instead of one long
  scroll, and its own folder list (`mobile/MobileFolderList.tsx`) beside the desktop panel
  (`layout/FolderLibrary.tsx`). New `presentations/props.ts` is the only thing they share.
  **Bound folder**: `Lembaran/src/folders/` (`showDirectoryPicker`, Dexie v2 table `folders`,
  `folderPermission` vs `ensureFolderPermission`, a `listFolder` walk bounded by `FOLDER_DEPTH_LIMIT` 8 and
  `FOLDER_FILE_LIMIT` 300, `readFolderFile`, and a persistence-free `pickFolderFallback` via
  `webkitdirectory` that reads `webkitRelativePath` so nested files survive there too) with pure helpers
  `shouldListPath` / `eligiblePaths` / `sortFolderFiles` / `folderView` / `pathSegments` and the hook
  `Lembaran.App/src/feature/folder/store.ts`; opening a folder file is `handoffFromFolderFile` (read through
  the handle → OPFS → remember → hand over a path). The section browses one level at a time instead of
  printing paths: subfolders first, breadcrumb to walk up, **ten 44 px rows** in a `max-height: 440px`
  scroller, and an `Expand` dialog at **90 vw × 90 vh** over `backdrop-filter: blur(10px)` on a darkened
  page — `layout/FolderOverlay.tsx` and `mobile/MobileFolderOverlay.tsx`, each with its own browser
  component. The bar carries no bind button, `Change folder` re-puts the same `bound` record, `Unbind` swaps
  itself for an inline `Forget / Cancel` pair, and recents gained a per-row **×** (`forget(id)` through
  `useRecents().remove`) with no confirmation.
  Two chrome fixes after that: the hub's reader strip is now a **single 30 px line** — a `‹` button plus the
  file name, no `Format — ` prefix — because the reader's own toolbar already shows the title; and
  **Ctrl/⌘ + wheel scales the app instead of the browser** — `theme/appScale.ts` cancels the wheel event,
  clamps 80–150%, persists `lembaran.scale`, shares it across frames through storage events, and `#root`
  applies `zoom` with `width/height: calc(100vw | 100dvh / s)` so nothing overflows (measured at 110%:
  `#root` still 1440 px wide in a 1440 px window). Frames embedded in the hub skip their own scaling
  (`ownsScale()`), and the hub bar shows the percentage as a reset button.
  Follow-ups the same hour: the percentage chip is **hidden at 100%** (only a changed scale is information),
  and the breadcrumb lost its `Up` label — the way out is a **`..` row at the top of the list**, with an up
  arrow and `up one folder` under it, in both the desktop and the phone browser.
  The folder's **Refresh button was removed** (and `refresh` from `BoundFolderApi`): on Chromium a re-walk
  returns the listing already on screen, and on Firefox the `webkitdirectory` fallback imported every file at
  pick time, so it could not show anything new either. The listing now re-reads on bind, on Reconnect and on
  reload, which are the moments something actually changes.
  Then the folder header became icons — `component/icons.tsx` (`ExpandIcon`, `SwapFolderIcon`, `UnlinkIcon`)
  on 28 px `.hub-icon-btn`s with `title` + `aria-label`; the **"first 300 shown" flag was dropped** (the cap is
  a guard, not information); and the count chip grew a hover/focus tooltip built from `folderCounts` (folders
  holding documents + a per-extension count mapped to reader names), so `126 readable` explains itself as
  `3 folders / 5 Excel / 6 Word …` without spending a line of the page. The expanded dialog also learned the
  second way to read a folder: a **Folders / All files** switch, with `FlatFileList` (desktop) and
  `MobileFlatList` (phone) listing every document in the tree with its folder in the meta line. Verified:
  expanding from `samples / reports` opens at that path with `["..", "2024"]`, All files lists all 6 documents,
  panel still 1296 × 810 in 1440 × 900, Escape closes, and the tooltip goes from opacity 0 to 1 with
  `1 folder / 2 PDF / 1 CSV / 1 Excel / 1 PowerPoint / 1 Word`.
  Then the folder area took over the browser's own back/forward: `feature/folder/history.ts` (`useFolderPath`)
  pushes `{ lbFolder: path }` per step and restores it on `popstate`, so the mouse thumb buttons and
  Alt+Left/Right walk the folder tree instead of leaving the hub; `mousedown` on buttons 3/4 is
  `preventDefault`ed so they cannot act as page controls. The hook is mounted inside the folder panel only, so
  an open reader keeps ordinary history. Verified: root `state ''` → `reports` `state 'reports'` →
  `history.back()` returns to `samples` with the URL still `/` → `history.forward()` returns into `reports`;
  a synthetic `mousedown({button: 3})` is cancelled.
  Then the phone layout stopped double-scrolling: `.hub-shell-phone` is `overflow: hidden`, `.hub-main` is the
  flex remainder (`min-height: 0`), the active section takes `height: 100%`, and the folder pane hands that
  height to `.hub-browse-phone` (`flex: 1; max-height: none`) — the ten-row cap stays a desktop rule, which is
  where a page scroll and a list scroll never coexist. Measured in a 390 × 844 frame with 20 files: list
  `636 px` tall, content `1496 px`, `documentScrolls: false`, `shell overflow: hidden`, and every hub scroller
  is `scrollbar-width: thin` with an 8 px transparent-track thumb (`::-webkit-scrollbar-thumb` too).
  Final polish from the same review: the chip reads `N files` instead of `N readable`, the footer line lost
  "here" (`1 folder · 5 files`, or just `0 files`), the `..` row lost its forward chevron (an up arrow is the
  only direction it goes), the tooltip became a **tile board** (`1 folder / 2 PDF / …`, one tile per kind,
  singular-aware), the folder icons grew to 34 px (40 px on a phone) with clearer glyphs — arrows out of a
  frame for expand, a folder with a circular arrow for change, a broken chain for unbind — and the phone gained
  the search box back (`hub-search-phone`, filtering readers and folder files) with the theme toggle pushed to
  the bar's end. Measured in the 390 px frame: icon 40 px, toggle gap 14 px (the bar's own padding), search
  present, `hello` filters the folder to four files, `documentScrolls: false`.
  Then search learned the whole tree and the wheel learned which view it is over. `searchFolder` (pure, in
  `entries.ts`) returns matching **folders anywhere** — tap one to walk to it — and matching **files anywhere**
  with their folder in the meta line, and both browsers render those results in place of the level view; the
  expanded dialog got the same field beside its **Folders / All files** switch. `theme/appScale.ts` stopped
  scaling the app whenever a reader was on screen: `onZoomRequest` registers a reader's document zoom, and
  Ctrl/⌘ + wheel now dispatches `lembaran:zoom` (`ZOOM_REQUEST`) instead of touching `--lb-app-scale` — so the
  PDF **re-rasterises its canvas** at the new scale rather than being zoomed as pixels, which is what made a
  zoomed page blurry. All four readers register it (`App.tsx` in `Lembaran.{Pdf,Docs,Excel,Pptx}` →
  `zoomIn`/`zoomOut`, `scaleIn`/`scaleOut`); the hub, with no reader in its own window, still moves the app
  scale. Verified in Chromium: one `ctrlKey` wheel inside the PDF frame took the reader from `100%` to `125%`
  with `detail {direction: 1}`, the fit canvas went from `630 × 892` to `1218 × 1725` device pixels (a fresh
  raster, not a stretched bitmap), and neither window carried `--lb-app-scale`; on the hub chrome the same
  wheel moved `--lb-app-scale` `1 → 1.1 → 1`. The phone tile board was also still stretching: it reserved
  four columns whatever the folder held, so `1 folder / 2 PDF` sat in a half-empty box — `hub-phone.css` now
  lays it out as **two wrapping columns at `width: max-content`**, measured at 390 px as `166 × 163` inside the
  window, with the desktop board unchanged at one row of six (`396 × 64`).
- **`Reverted:` the phone's folder expand dialog** (UI simplification, same day). A phone already gives the
  folder its own tab and the whole remaining screen, so a 90 vh sheet over it was a second copy of a view the
  user was already in. `mobile/MobileFolderList.tsx` lost its `Expand` button, its `expanded` state and the
  `<MobileFolderOverlay>` render; `mobile/MobileFolderOverlay.tsx` and `mobile/MobileFlatList.tsx` were deleted
  (they existed only for that sheet) along with the phone-only `.hub-overlay-sheet`,
  `.hub-overlay-modes` and `.hub-search-overlay-phone` rules in `hub-phone.css`. The desk keeps its overlay
  untouched. The phone panel is now exactly: header (name, count chip, change folder, unbind), breadcrumb, list,
  footer — one scroller, no dialog.
- **A phone reader stopped repeating the file name, and CSV moved its controls into the header** (UI polish,
  same day). The hub's strip already prints `‹ cities.csv` one line above the frame, so every phone shell
  printed the same name a second time: `isFramed()` (`Lembaran.UI/src/shell/frame.ts`, `window.top !==
  window.self`) makes `PhoneShell` drop its title while framed, and `PdfMobileShell` does the same by hand.
  `PhoneShell` gained an `actions` slot at the left of that now-single header line, with
  `.lb-phone-end` pushing a control to the far right. CSV uses it: the old bottom bar of three labelled
  buttons became three 44 px icons on the header row — `open` (folder) at the left, the separator as a
  `columns` icon with the native `<select>` laid over it at opacity 0 (so the words live in the list, one tap,
  no popover to build), and full screen as `lb-phone-end` at the right edge. The sheet's shape moved out of
  the header to the **bottom right** (`401 × 7`, `csv-phone-size`) beside the selected-cell read-out, which
  stayed bottom left. The glyph set itself became shared: `Icon`/`IconName` moved from
  `Lembaran.Pdf/src/presentations/library/Icon.tsx` into `Lembaran.UI/src/components/icons/Icon.tsx` (plus a
  `columns` glyph) and is exported from `@lembaran/ui`; PDF's `IconButton` and `PdfMobileShell` import it
  from there. Measured at 390 × 844 with `cities.csv` open: hub bar `‹ cities.csv` 30 px, reader header 49 px
  with no `.lb-phone-title`, icons at `x 2 / 48` and full screen at `x 334` (the far end), bottom bar 32 px
  with the read-out at `x 12` and `401 × 7` at `x 341`, grid stage 733 px tall.
- **CSV cells resize, and the shape is kept per file** (feature). `feature/grid/sizes.ts` adds `GridSizes`
  (sparse `columns` map + one `rowHeight`), `clampColumnWidth`/`clampRowHeight`, `columnOffsets` (prefix sum)
  and `visibleSlice` (binary search over the offsets, replacing uniform-width arithmetic in the grid) plus the
  hook `useGridSizes(docKey)`; `CsvGrid` renders a 9 px `.csv-grip` on each header's right edge (drag a
  column's width) and on each gutter row's bottom edge (drag one height for every row), tracked on `window`
  during the drag and reset by double-click; `is-col-resizing`/`is-row-resizing` on the grid make the cursor
  follow the whole surface. Widths persist in `localStorage['lembaran.csv.sizes']` under the file's name,
  written 300 ms after the last move. Both shells pass `docKey={props.name}`. New
  `feature/grid/sizes.test.ts` (4 tests) covers clamping, the offsets and the slice. Verified with synthetic
  pointer drags: column A 148 → 288 with its cells and the canvas total (`1232 px`) following, the header
  staying in step at `scrollLeft 200`, a row drag 26 → 40 on every row, double-click back to 148, and the
  saved shape reapplied on reopen; on a phone the grips measure 18 × 28 and 55 × 14.
- **Header round two: uniform tiles, a theme switch on a phone, icon-only desk controls, comma by default**
  (UI polish). The tile board drew its tiles at whatever width each label needed, so `POWERPOINT` made one
  box half again as wide as the rest — tiles are now a fixed `62 px` and the long reader name is shown as
  `Slides` (`SHORT_LABELS` in `CountChip.tsx`), measured at `62 / 62 / 62 / 62 / 62 / 62` in a `420 px`
  board. `PhoneShell` now always ends its header line with `<ThemeToggle />` plus an optional `end` control
  after it (a phone has no hub bar while a document is open), so CSV's full screen lands at the far right
  with the theme switch to its left (`x 296` and `x 342` in a 390 px frame, after `open` at `2` and the
  separator at `48`); `PdfMobileShell` puts the same switch before its full-screen button. The CSV desk
  toolbar lost its words: `Open` and `Full screen` are `Icon` buttons now (`open`, `fullscreen` /
  `exitFullscreen`), and the separator defaults from the extension — `defaultDelimiter()` in
  `feature/grid/store.ts` returns `,` for a `.csv` and `\t` for a `.tsv`, so a CSV opens as `Comma` with
  `Detect` still one choice away (new test in `store.test.ts`). The desk bar's search lost its 460 px cap
  (`flex: 1`, measured `789 px` in a 1200 px window) and the scale chip is shown at every value on a desk
  and not at all on a phone.
- **The phone's scrollbar moved to the window's end** (UI fix). It floated 14 px inside the shell's padding,
  which read as an unfinished box with a cut-off card under it. `.hub-main` now keeps only its left inset and
  the scrolling element owns the right padding: a section on Readers/Recent, and the folder list inside the
  pane (the pane itself drops the right padding through `.hub-main > section.hub-pane`, since the plain
  `> section` rule outranks `.hub-pane` on specificity). Each scroller adds 14 px of right padding as the gap to
  its bar, 14 px under the last card, and `scrollbar-gutter: stable`. Verified at 390 × 560 on both tabs:
  scroller right edge `390`, bar `10 px`, card edge `366` (24 px gap), `14 px` under the last card when
  scrolled to the end.
- **The desk hub scrolls below its bar, not under it** (UI fix). `HubShell` had a sticky `blur` bar over a
  scrolling `.hub-shell`, so content slid behind the header and the page's own scrollbar ran the whole window
  height. The shell is now `overflow: hidden` with a `flex: none` bar and foot, and `.hub-main` is the
  remainder (`flex: 1; min-height: 0; overflow-y: auto`, thin bar, overscroll contained); the 1080 px measure
  moved into a new `.hub-main-inner` so the scroller itself is full width and its scrollbar ends at the window's
  edge. Verified in 900 × 620 and 1440 × 900 frames: bar `0–57`, main top `57` (exactly under it), foot pinned
  at the bottom (`559–620` / `839–900`), `main.scrollTop` accepted `400`, and `documentScrolls: false` in both —
  the phone shell is untouched (`mainOverflow: hidden`, its section still scrolls to `390`).
- **The phone folder pane keeps its inset where it matters** (UI fix). Letting the list reach the window's end
  had also pulled the folder head to the border, so the change/expand icons sat against it. The pane's
  `padding-right` is back and only `.hub-browse-phone` steps past it (`margin-right: -14px`, with the gap
  restored as its own padding), and a folder row now carries `padding: 10px 14px` instead of `0 12px` so its
  label, icon and chevron sit inside the button. Verified at 390 px: head right `376`, last action icon `376`,
  list right `390`, rows `14 → 366`, chevron `14` from the row's edge.
  Then the phone bar became **one row** — mark, wordmark, a 9 px `0.1.0-alpha` chip, the search field and the
  theme toggle (`__APP_VERSION__`, defined by both Vite configs from `Lembaran.App/package.json`, so the version
  is not typed twice) — and the stuck helper was fixed: `CountChip` replaced the span-with-`:focus` chip, so a
  desk opens the tiles on hover (`@media (hover: hover)`) and a finger toggles them, with `pointerdown` outside
  and Escape closing it. Verified at 390 × 844: bar children share one row (`tops 9/8/8`), version font 9 px,
  tooltip `opacity 0` → tap → `1` (`is-open`) → outside tap → `0`.
  Verified in Chromium (342 px pane, plus a 980 px iframe for the desktop layout): bar/tabs/sections
  render, the palette computes to `#e6f0e7` ground / `#f2f8f1` surfaces / `#2c6a43` primary in pastel and
  `#0f1712` / `#17231a` in dark, the bound folder **survived a reload** and listed 5 files
  (`cities.csv`, `hello.docx`, `hello.pdf`, `hello.pptx`, `hello.xlsx`) with sizes and dates, clicking
  `hello.pdf` opened the PDF reader with 2 pages inside the hub frame, and the dark theme propagates into
  a reader's iframe. `npm run typecheck` and `npm test` pass (new `Lembaran/src/folders/entries.test.ts`).
  Files: `Lembaran.UI/src/theme/{tokens.css,preference.ts,preference.test.ts,ThemeProvider.tsx,ThemeToggle.tsx}`,
  `Lembaran.UI/src/components/{surface/surface.css,rail/rail.css}`,
  `Lembaran.Pdf/src/presentations/pdf.css`, `Lembaran.Excel/src/presentations/excel.css`,
  `Lembaran/src/{folders/**,handles/store.ts,index.ts}`, `Lembaran/package.json`,
  `Lembaran.App/src/{App.tsx,presentations/**,feature/folder/**,feature/embed/**}`,
  `AGENTS/{ARCHITECTURE,DEVNOTES,PLAN,LIMITATION,CHANGELOG}.md`.

- **Cloud drives are named for a later version, and the seam they will use is documented** (design only,
  no code). The user wants OneDrive and Google Drive accounts with live sync and, eventually, editing.
  Recorded in [ARCHITECTURE.md](ARCHITECTURE.md) as a new § Cloud drives (planned, not built) and in
  [PLAN.md](PLAN.md) § F as named work with unticked boxes; `0.1.0-alpha` stays a read-only local reader.
  The decision that matters for today's code: **a drive is another `DocumentSource`, not another reader**.
  It answers the same three questions as File System Access — give me the bytes, tell me if they changed,
  take new bytes back — so the framework resolves a `{kind:'cloud'}` source into an OPFS copy exactly as
  it resolves a picked file, and no reader or engine ever learns a provider exists. The rule that Lembaran
  runs no server survives with one wording change: the only added endpoints are the provider's own API
  origins (`connect-src` grows those and nothing else), so "no file leaves the device" becomes "none
  leaves unless you connected a drive". Shape recorded for `Lembaran/src/cloud/`: OAuth 2.0 + PKCE in a
  popup with no client secret, tokens in IndexedDB beside the handle records, delta polling (`/delta`,
  `changes.list`) while the tab is visible instead of a push channel, and `write(bytes, etag)` where a
  `412`/`409` is a conflict shown to the user, never a silent overwrite. Two questions are deliberately
  left open for that version: **where the integrated file manager lives** (a Lembaran-side library across
  local + both drives, or the provider's own picker with no local library) and **where a save lands** (in
  place with `etag` conflicts, or a local OPFS copy plus an explicit upload). No file changed under `src/`.
  Files: `AGENTS/{ARCHITECTURE,PLAN,LIMITATION,CHANGELOG,CHANGELOG-DEV}.md`.

- **Standard fonts fall back to open substitutes, and CI now builds while Cloudflare Pages only hosts**
  (feature + infrastructure). The four Microsoft core families are proprietary and are never bundled or
  served, so 16 OFL-1.1 / Bitstream-Vera faces were vendored into `public/fonts/` — **Carlito**
  (Calibri), **Liberation Sans** (Arial, Helvetica), **Liberation Serif** (Times New Roman, Times) and
  **DejaVu Sans** (Verdana) — with `manifest.json` (family, faces, weight, style, copyright, source,
  version, licence file), `README.txt` and `licenses/`. `Lembaran.UI/src/theme/fonts.css` aliases them
  **under the document's own family names** (24 `@font-face` rules, `local()` first so an installed
  original wins), which is what lets docx-preview's inline `font-family: Calibri` and a canvas
  `ctx.font = '16px Arial'` resolve at all; `standardFonts.ts` exposes `loadStandardFonts()` (never
  rejects) for the Word reader to await before `renderAsync` and for the Excel grid to repaint after.
  PowerPoint paints in WASM and takes *bytes*, so `Lembaran.Pptx/src/feature/fonts/fonts.ts` fetches
  faces and `openDeck` registers them with `handle.registerFont` — but only for the families the deck
  names, read from `handle.snapshot()` before the first `layoutSlide`: fetching the whole set for every
  deck was 4.1 MB gzip against 0.83 MB for an Arial-only deck, measured and fixed the same day.
  DejaVu Sans is **not** metric-compatible with Verdana (the other three are), which is documented as a
  limitation rather than hidden. `scripts/build-all.mjs` copies `public/fonts` to `dist/fonts`,
  `gen-notices.mjs` adds a vendored-font section (13 notice entries: 9 dependencies + 4 families) and
  `licenses-check.mjs` now fails when a face or its licence text disappears. `.github/workflows/build.yml`
  runs `npm run gates` on every push and pull request with Node from `.nvmrc` (22), uploads `dist`, and
  deploys that same artifact to Cloudflare Pages from `main` or `workflow_dispatch` via
  `cloudflare/wrangler-action@v3` (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
  `vars.CLOUDFLARE_PAGES_PROJECT || 'lembaran'`) — Pages never builds.
  Verified in Chromium: `hello.docx` fetches exactly the 8 Liberation faces it needs
  (`/fonts/LiberationSans-*.ttf`, `/fonts/LiberationSerif-*.ttf`) and renders 2 pages with the fixture
  text; `hello.pptx` fetches only `/fonts/LiberationSans-*.ttf` (4 files, not 16) and paints slide 1 of 3
  with no overlay; the hub's 24 alias faces are present and `unloaded` until used. `npm run typecheck`
  and `npm run build` pass, `dist/fonts` and `dist/_headers` (`font-src 'self'`) ship.
  Files: `public/fonts/**` (new), `Lembaran.UI/src/theme/{fonts.css,standardFonts.ts}`,
  `Lembaran.UI/src/index.ts`, `Lembaran.Pptx/src/feature/fonts/**` (new),
  `Lembaran.Pptx/src/feature/deck/deck.ts`, `Lembaran.Docs/src/feature/render/render.ts`,
  `Lembaran.Excel/src/presentations/layout/viewport/GridCanvas.tsx`, `scripts/{build-all,gen-notices,
  licenses-check}.mjs`, `.github/workflows/build.yml` (new), `.nvmrc` (new), `NOTICE`,
  `AGENTS/{FRAMEWORK,DEVNOTES,PLAN,LIMITATION,CHANGELOG}.md`.

- **Excel reads workbooks, and the hub's last "coming next" card is gone** (feature). `Lembaran.Excel`
  composes `@betteroffice/xlsx@0.5.1` (Apache-2.0): `openWorkbook(bytes)` gives a synchronous handle,
  `readCells({ranges: []})` the sheet catalog with visibility, `sheetInfo()` the active sheet's content
  extent and frozen panes, `displayList({x,y,width,height})` the visible window and `paintDisplayList`
  the canvas. The reader paints only that window: a native scroller holds a spacer the size of the sheet
  and a sticky canvas repaints at the scroll offset on `requestAnimationFrame`; zoom builds the list at
  `viewport / zoom` and paints at `dpr × zoom`; a click maps back through the same factor, and the
  selected cell is read through `readCells` for the status line. Find uses `searchText` across sheets and
  jumps by activating the sheet and scrolling to `cellPosition`. Hidden sheets are filtered from the
  tabs, frozen panes come from the engine, `.xlsm` opens and its VBA never runs, `.xls` is rejected in
  the prompt. Own GUI in `Lembaran.Excel/src/presentations/` with a `mobile/ExcelMobileShell` (sheet
  stepping in the phone bar) and no shared chrome beyond `@lembaran/ui`.
  Fixture: `samples/hello.xlsx`, generated by `scripts/make-sample-xlsx.mjs` — 3 visible sheets + 1
  hidden, merged title, header fill, `COUNTA`/`SUM`/`AVERAGE`/`MAX` with cached values, a percentage
  cell. Measured: JS **117.5 KB gzip**, CSS **2.6 KB**, WASM **7.58 MB → 2.91 MB gzip**; verified in
  Chromium — tabs `Cities/Summary/Notes` with `Raw` hidden, `A1: City` on open, formulas read
  `B3 5`, `B4 32275814`, `B5 727.87`, `B6 43.25%`, find "Tokyo" → `1 of 2` on Cities A6 then Summary A9,
  a 500-row workbook scrolls 9,484 px in a 656 px viewport and repaints the window with the header row
  and first column pinned (frozen pane at `scrollTop` 3000), the built site on a plain static server
  opens the same fixture with its WASM fetched from `/xlsx/assets/`, and at 360 px the phone shell
  shows its sheet bar. `npm run gates` passes; notices now list 9 dependencies.
  Files: `Lembaran.Excel/**` (new), `scripts/make-sample-xlsx.mjs`, `samples/hello.xlsx`,
  `Lembaran.App/src/presentations/component/ReaderCard.tsx` ("Open an Excel file"),
  `Lembaran.App/src/feature/choose/registry.generated.ts`, `package.json` (+`@betteroffice/xlsx`,
  `jszip` dev), `package-lock.json`, notices, `AGENTS/{FRAMEWORK,LIMITATION,PLAN,DEVNOTES}.md`.

- **Site-root assets moved to the repository's `public/`** (build). `_headers` (COOP/COEP/CSP) used to
  live in `Lembaran.App/public/`, while the fonts live in `public/fonts/`; Vite then warned 16 times per
  build that `url('/fonts/…')` in `fonts.css` "didn't resolve at build time". Both now sit in
  `public/`: the hub sets `publicDir` to it and keeps copying into the site root, while the five readers
  set the same `publicDir` with `build.copyPublicDir: false` so they resolve the URLs quietly and never
  copy 8.2 MB of faces into their own folder. `npm run build` is now warning-free.
  `Moved: Lembaran.App/public/_headers → public/_headers` (the note in the 2026-11-24 `_headers` entry
  above points at the old path).
  Files: `public/_headers`, `Lembaran.App/public/` (removed), `Lembaran.App/vite.config.ts`,
  `Lembaran.{Csv,Docs,Excel,Pdf,Pptx}/vite.config.ts`.

- **The version is `0.1.0-alpha`** (release metadata). Every manifest (root + 7 workspaces) carries the
  prerelease id, `package-lock.json` was resynced from them, and `npm run notices` regenerated
  `ownLicense.version` from the manifest rather than a literal. The heading the user reads
  (`AGENTS/CHANGELOG.md`), the plan table and its milestone heading, `FRAMEWORK.md`'s own row and the
  skill's "last named version" line all say `0.1.0-alpha`. No code or dependency changed.
  Files: `package.json`, `Lembaran*/package.json`, `package-lock.json`,
  `Lembaran/src/licenses/notices.ts`, `AGENTS/{CHANGELOG,CHANGELOG-DEV,FRAMEWORK,PLAN}.md`,
  `AGENTS/skills/lembaran/SKILL.md`.

- **The whole repository is now `GPL-3.0-only`** (license). `LICENSE` was Apache-2.0; it is the verbatim
  GNU GPL version 3, 29 June 2007 (35,149 bytes, fetched from gnu.org — never retyped), with a copy in
  `LICENSES/GPL-3.0-only.txt`. Root and all seven workspace manifests declare the id, `package-lock.json`
  was resynced from them, and `NOTICE` now carries the GPL notice plus the Corresponding Source
  statement a static build owes. Every dependency stays permissive — MIT (`react`, `papaparse`),
  Apache-2.0 (`pdfjs-dist`, `dexie`, `comlink`, `docx-preview`, `@betteroffice/*`), OFL-1.1 for future
  font assets — so no dependency was relicensed and no text changed in `LICENSES/*.txt` except the
  addition. `scripts/gen-notices.mjs` no longer hardcodes the app license: it reads `license`,
  `version` and a `repository`/`homepage` URL from `package.json`, so `ownLicense` and the notice header
  cannot drift. Both files regenerate byte-identically on a second `npm run notices`. `npm run
  licenses:check` now also fails when the project's own license has no text in `LICENSES/` (it checked
  only dependencies before). `npm run build` copies `LICENSE`, `NOTICE` and `THIRD-PARTY-NOTICES.md`
  into `dist/` as `LICENSE.txt`, `NOTICE.txt` and `THIRD-PARTY-NOTICES.txt` and fails if a copy is
  missing — the served bundle is the object code the license is about. The decision and its obligations
  are in `docs/adr/0001-adopt-copyleft-license.md`; the rule is stated in `AGENTS.md` rule 7, the
  lembaran and license-compliance skills, and `.github/copilot-instructions.md`. Follow-up, tracked in
  `AGENTS/PLAN.md`: publish the repository and add `repository` to `package.json` so the source offer
  prints a URL.
  Files: `LICENSE`, `LICENSES/GPL-3.0-only.txt`, `NOTICE`, `THIRD-PARTY-NOTICES.md`, `package.json`,
  `Lembaran*/package.json`, `package-lock.json`, `scripts/{build-all,gen-notices,licenses-check}.mjs`,
  `Lembaran/src/licenses/notices.ts`, `docs/adr/0001-adopt-copyleft-license.md`,
  `AGENTS/{FRAMEWORK,PLAN,DEVNOTES,CHANGELOG,CHANGELOG-DEV}.md`, `AGENTS/skills/*/SKILL.md`,
  `AGENTS.md`, `.github/copilot-instructions.md`.

- **A phone layout now has its own files, starting with the frame** (architecture). `ReaderShell.tsx` held
  the desktop frame and `PhoneShell` in one module, and `shell.css` carried every `.lb-phone-*` rule
  beside the desktop frame. The two platforms are separate files now:
  `shell/desktop/ReaderShell.tsx`, `shell/mobile/PhoneShell.tsx` (+ `shell/mobile/phone.css`, imported by
  the component itself), with `shell/Stage.tsx` holding the only shared pieces and `shell/shell.css`
  reduced to the desktop frame plus the neutral root/stage/body classes (122 lines, phone block gone).
  The rule is written into `AGENTS.md` (rule 8), `.github/copilot-instructions.md` and
  `AGENTS/ARCHITECTURE.md`: a mobile view gets its own `.tsx` and its own CSS, never a branch or a phone
  `@media` block in a desktop file, and only `App.tsx` chooses between the shells.
  CSV was the one reader with no phone shell — it now has `presentations/mobile/CsvMobileShell.tsx`
  (+ `mobile/csv-phone.css`) rendering the same grid with a name/size header, a live selected-cell
  read-out and three thumb-sized controls (Open, separator, full screen), while `CsvShell` stays
  desktop-only. The same split reached the two phone styles that were still living in desktop
  stylesheets: PDF's `.pdf-phone*` block left `pdf.css` for `presentations/mobile/pdf-phone.css`
  (imported by `PdfMobileShell`), and the hub's list layout left `hub.css` for
  `presentations/mobile/hub-phone.css`.
  Verified at 360×800 in the Word reader: `.lb-phone-header` computed `display: flex`,
  `.lb-phone-action` `min-height: 44px`, `.lb-phone-bar` with its safe-area padding, and no `.lb-toolbar`
  in the DOM — so `phone.css` travels with the phone component. In CSV at 360×800: header `cities.csv`
  `401 × 7`, tapping Jakarta read `B2: Jakarta`, no toolbar/status; at 1280×800 the toolbar and status
  line return with the selection. PDF at 360×800 still computes `.pdf-phone-header`/`.pdf-phone-bar`
  `display: flex`, 44 px `.pdf-phonebtn` and its 6 px safe-area padding from the moved file; the hub at
  360 px still gets `.hub-list` `gap: 10px` and `16px` under its header. Built CSS (gzip) after the
  split: PDF 4,018 B (+22), Word 2,533 B (+18), PowerPoint 2,372 B (+21), CSV 2,779 B (+70, the new
  phone stylesheet), hub 1,850 B. `npm run typecheck`, `npm test` and `npm run build` pass.
  Files: `Lembaran.UI/src/shell/{Stage.tsx,index.ts,shell.css,desktop/ReaderShell.tsx,mobile/PhoneShell.tsx,mobile/phone.css}`,
  `Lembaran.Csv/src/{App.tsx,presentations/layout/CsvShell.tsx,presentations/mobile/{CsvMobileShell.tsx,csv-phone.css}}`,
  `Lembaran.Pdf/src/presentations/{pdf.css,mobile/{PdfMobileShell.tsx,pdf-phone.css}}`,
  `Lembaran.App/src/presentations/{hub.css,mobile/{HubMobileShell.tsx,hub-phone.css}}`,
  `AGENTS.md`, `.github/copilot-instructions.md`, `AGENTS/{ARCHITECTURE,DEVNOTES}.md`.

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
