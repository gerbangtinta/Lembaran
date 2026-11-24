# Changelog

What the app can do, by version, in plain terms. The code-level record is
[CHANGELOG-DEV.md](CHANGELOG-DEV.md).

# 0.1.0-alpha — in progress

Five readers work: **PDF**, **CSV**, **Word**, **PowerPoint** and **Excel**.

- **PDF** — continuous scrolling, selectable text, find in document, zoom, a page rail, full screen, and
  highlights with notes that stay on this device. It also **edits**: rotate a page, delete a page, insert a
  blank one; draw with a pen, place a text box or an image on the page; then **save over the file you opened**,
  optionally rewriting the structure (lossless) and recompressing its photos. Text is never turned into a
  picture. Pages can be dragged into a new order, right-clicked for rotate / insert / delete, and a blank page
  takes the same paper as the page it follows; undo and redo are on the bar and on `Ctrl+Z` / `Ctrl+Y`, and the
  fit button switches between fitting the width and fitting the height. A signature or a stamp can be drawn on a
  pad or uploaded, then placed like any picture. A page keeps its shape when it is turned or zoomed past the
  window instead of being squeezed, a blank page shows its own paper, drawn ink keeps the thickness it will have
  in the file, and one Undo takes back exactly one change.
  **Save asks and then replaces the file**: `Ctrl+S` too, and nothing else is asked — the edits are written in as
  they are. **Compress is its own button**, for when the file has to be smaller: pick **Low, Medium or High**, name
  the **size you want it to end at**, or set it all by hand — photos (quality and the largest edge they keep) and
  the structure that carries the text and the vector lines, each on its own. It shows what each attempt came to
  before anything is written, and says plainly when a size cannot be reached because the rest of the file is the
  document's own words.
  **Anything you place can be changed after it lands**: drag it to move it, drag a corner to resize it (a picture
  keeps its shape), double-click a text box to rewrite it, and Delete or the `×` takes it away.
  **Text already in the page can be replaced**: pick the run, write the new words, and a patch hides the old ones.
  **A signature is drawn once**: it is kept with your stamps and offered again in the next document.
  **A stamp is built, not typed in one field**: heading, name, position, organisation, date and any row you add —
  each one bold or not and each one small, medium or large, in the order you drag them into — inside a paper-stamp
  frame or a clean digital one, with four inks and capitals. A stamp is **pressed, not printed**: *Perfect* is a
  clean mark, *Natural press* leans a little off square and lays its ink twice, and *Worn rubber* also grains it,
  so no two impressions are quite the same. A preview that redraws as you type sits in a window of its own, so a
  long line shrinks the mark instead of stretching the room around it. It is kept with its settings, so you can
  reopen it next month and change the position without drawing it again, and it lands on the page at the size it
  was designed at. APPROVED, REVIEWED, DRAFT, PAID and VOID are one click; a scanned stamp can be uploaded too.
  An image, a signature or a stamp is placed where you click, and the status line says so until you click. A tool
  never traps you: the bar shows a **Done** button while one is armed, and `Enter`, `Esc` or `D` put the pen down.
  A highlight opens its note again and takes typing: the note is kept when you close it, and Delete takes the
  highlight away (on an empty note one Delete is enough). A blank page you inserted can be deleted like any
  other. Find in document jumps to each hit, marks it on the page, and starts fresh the next time you open it.
  A text box you place can sit on a white patch so it reads over a picture, and text that replaces the page's
  own words always gets one.
  The bar stays one row beside the pages: the page's own
  actions (rotate, insert a blank, delete) and the things you add (text, text edits, pictures, signatures) sit
  behind two labelled menus, the highlight colours open under their button, and the page switch — previous,
  the page number to jump to, next — sits under the thumbnails, next to the pages it moves through.
  On a phone the PDF still reads, searches and highlights; the editing tools are on the computer.
- **CSV** — delimiter detection with a manual override, a sticky header and row gutter, cell selection in
  the status bar, and **cells you can resize**: drag the line between two column headers to widen a column,
  drag the line under a row number to make every row taller (double-click either one to put it back). The
  shape you give a file is remembered the next time you open it; four hundred rows or four hundred thousand
  cost the same to display.
- **Word** — a `.docx` is laid out as pages, with headings, bold and italic runs, lists, tables, headers
  and footnotes. Zoom, page navigation, find, full screen and the phone shell are the same in every reader.
- **PowerPoint** — a `.pptx` is painted slide by slide by a Rust/WASM layout engine, with a thumbnail rail,
  arrow-key navigation, zoom and full screen.
- **Excel** — an `.xlsx` or `.xlsm` opens as a painted grid: the workbook's own sheet tabs at the bottom,
  every formula already calculated, frozen panes held in place, hidden sheets left out of the tabs.
  Click a cell to read its address and value, scroll a sheet of any size, find across all sheets, zoom,
  go full screen — and the phone gets its own sheet-stepping bar.

Every reader now draws its side rail, its paper, its top bar and its status line from one shared set of
components, so a page and a slide cannot drift apart. A properties window is prepared in the same frame
and is not opened anywhere yet. Fixed on the way: a page rail with more pages than fit used to stack its
thumbnails on top of each other instead of scrolling.

The shared layout hooks now ask one question each — is this a phone (mobile), a wide screen (desktop),
or is the reader in full screen — and every reader answers them the same way. A phone layout is its own
file with its own styles, so a phone screen and a desktop screen can no longer grow inside one component.
CSV gained the phone reader it was missing: the same grid, with the selected cell read out under it and
Open, separator and full screen within thumb reach.

Nothing is uploaded; a reader writes only the file you ask it to save, and the file is remembered so it opens again from the recent
list. Excel was the last reader marked "coming next"; it is built now.

Lembaran is free software under the GNU General Public License v3: anyone may study it, change it and
share it, and a changed version must stay free in the same way. The libraries it is built on keep their
own permissive licenses (MIT, Apache-2.0), and their notices ship with the app. The full license is in
`LICENSE`, and the source of any published build is its public repository.

Documents keep their proportions even when the font they name is Microsoft's. Calibri, Arial, Times New
Roman and Verdana cannot be given away with an app, so Lembaran brings open equivalents instead — Carlito
for Calibri, Liberation Sans for Arial, Liberation Serif for Times, DejaVu Sans for Verdana — and uses them
under the name the document asks for. Word pages break where they should, and slides keep their spacing.
Verdana is the one approximation: its stand-in is slightly wider. Every one of these fonts is free to
redistribute, and their licenses are in the app's license folder.

The site builds itself: every push is type-checked, tested, license-checked and built, and every build on
`main` is published to Cloudflare Pages. Nothing is compiled on the hosting side, so the file that runs is
exactly the file the checks passed.

The app is green now, and nothing in it is white except the paper a document is drawn on. A pastel green
ground, a darker green for the buttons that do something, and a clay tone for the things that want your
attention; the dark theme follows the same three colours. The hub became an app instead of a demo page: one
strip across the top with the name, a search box that filters readers and files, the folder button and the
theme switch, then three sections — Folder, Readers, Recent — on a phone three tabs instead. On a computer
that strip and the line at the foot stay put: only the part between them scrolls, so nothing ever slides
under the header, and a list on a phone keeps a gap from its own scrollbar instead of touching it.

**Binding a folder is the new one.** Pick a folder once and Lembaran keeps it: what is inside is browsed
like a folder — subfolders first, a breadcrumb to step back out, `..` at the top of the list to go up — and
any file opens straight into the right reader. Typing in the search box searches the **whole folder**, not just
the level you are looking at: matching folders appear first (tap one to step into it) and then matching files
from any subfolder, each showing where it lives. The list shows ten rows and scrolls inside itself; on a
computer **Expand** puts the same folder in a window over 90% of the screen on a blurred, dimmed page, with its
own search and read two ways: step through folders, or **All files** — every document in the tree in one list.
A phone has no Expand button: the folder is already a tab of its own filling the screen. The header's actions are
icons, and the count beside the folder name explains itself on hover: how many folders, and how many PDFs,
Word files, slides, sheets and CSVs are inside. It is still there next session — the browser asks once more
for permission and Reconnect brings the list back; Change folder repoints it without unbinding first, and
Unbind asks before it forgets. A browser that cannot remember a folder (Firefox, iOS) says so instead of
pretending, and there is no Refresh button: the list is read when the folder is bound, when permission
returns, and when the app is reloaded.

Recent entries each end with a small ×: one click drops that shortcut, no question asked, because the file
itself is not touched.

**Ctrl + scroll zooms what you are looking at.** Over the hub it scales the app — the percentage sits at the
end of the desk's bar, where clicking it goes back to 100%, and the scale is remembered and shared, so a
document opened here keeps the same size as the pages behind it; a phone shows no percentage because it has no
Ctrl + scroll. Over an open document the same gesture now
zooms **the document**, which is redrawn at the new size, so a PDF page stays sharp instead of turning into
pixels. While a document is open the hub's own strip is a single thin
line — a way back and the file name — and on a phone the reader below it no longer repeats that name: the one
line it keeps holds the reader's own icons, with **full screen at its far end** and the theme switch right
before it. In the CSV reader those icons are Open, the
separator and full screen, and the sheet's size (`401 × 7`) sits at the **bottom right** beside
the read-out of the cell you tapped. The separator starts on **comma** for a `.csv` and on tab for a `.tsv`,
because that is what the extension means, with `Detect` one choice away; on a computer Open and full screen are
icons too, the search box fills the bar, and the count bubble that explains a folder (`1 folder · 2 PDF ·
1 Slides · 1 Word`) draws every tile the same width. Inside a folder,
the way up is the `..` row at the top of the list, and the mouse's **back and forward buttons walk the folder
tree** instead of leaving the page. On a phone the folder fills the screen: the page no longer scrolls behind
it, only the list does, every scrollbar is thin and quiet, the search box is still there — on the same top row as
the name, the version and the theme switch — and the count beside the folder name says `6 files` and opens a
little board of tiles on hover (on a phone, a tap opens it and a tap elsewhere closes it): `1 folder · 2 PDF ·
1 CSV · 1 Excel · 1 PowerPoint · 1 Word`.

Not in this version, written down so it is not improvised later: opening a document out of a **OneDrive**
or **Google Drive** account, keeping it in step with the drive while it is open, and saving edits back to
it. The intent is that a drive behaves exactly like a file you picked — same open, same save, same "did it
change" — so no reader has to learn about providers. Where that integrated file manager lives, and where a
save lands, are open questions recorded with the design. Until then Lembaran starts and ends with files on
this device, and there is no Lembaran server anything could sync through.

Planned for this version:

- [x] Open a PDF from disk, and come back to it later from the recent list.
- [x] Read a PDF with selectable text, find, zoom, thumbnails and a page box.
- [x] Full screen, with keyboard shortcuts for the whole reader.
- [x] Highlight an area of a page and write a note on it; notes persist and never change the file.
- [x] Build everything with one command: the hub and every reader.
- [x] Read CSV files over a virtualized grid with delimiter detection.
- [x] Read Word documents as pages, with find and page navigation.
- [x] Read PowerPoint decks as painted slides with a thumbnail rail.
- [x] Read Excel workbooks, with sheet tabs, column and row headers, formulas and frozen panes.
- [x] Bind a folder once and open any readable file inside it, next session too.
- [ ] Keep working offline once a reader has been used.
- [ ] Read every third-party license that ships inside the app.
- [x] Nothing native to install — the browser is the app.

