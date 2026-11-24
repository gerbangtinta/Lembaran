# Changelog

What the app can do, by version, in plain terms. The code-level record is
[CHANGELOG-DEV.md](CHANGELOG-DEV.md).

# 0.1.0 — in progress

Three readers work: **PDF**, **CSV** and **Word**.

- **PDF** — continuous scrolling, selectable text, find in document, zoom, a page rail, full screen, and
  highlights with notes that stay on this device.
- **CSV** — delimiter detection with a manual override, a sticky header and row gutter, cell selection in
  the status bar; four hundred rows or four hundred thousand cost the same to display.
- **Word** — a `.docx` is laid out as pages, with headings, bold and italic runs, lists, tables, headers
  and footnotes. Zoom, page navigation, find, full screen and the phone shell are the same in every reader.
- **PowerPoint** — a `.pptx` is painted slide by slide by a Rust/WASM layout engine, with a thumbnail rail,
  arrow-key navigation, zoom and full screen.

Every reader now draws its side rail, its paper, its top bar and its status line from one shared set of
components, so a page and a slide cannot drift apart. A properties window is prepared in the same frame
and is not opened anywhere yet. Fixed on the way: a page rail with more pages than fit used to stack its
thumbnails on top of each other instead of scrolling.

The shared layout hooks now ask one question each — is this a phone (mobile), a wide screen (desktop),
or is the reader in full screen — and every reader answers them the same way.

Nothing is uploaded, no file is modified, and the file is remembered so it opens again from the recent
list. Excel is listed in the hub marked "coming next".

Planned for this version:

- [x] Open a PDF from disk, and come back to it later from the recent list.
- [x] Read a PDF with selectable text, find, zoom, thumbnails and a page box.
- [x] Full screen, with keyboard shortcuts for the whole reader.
- [x] Highlight an area of a page and write a note on it; notes persist and never change the file.
- [x] Build everything with one command: the hub and every reader.
- [x] Read CSV files over a virtualized grid with delimiter detection.
- [x] Read Word documents as pages, with find and page navigation.
- [x] Read PowerPoint decks as painted slides with a thumbnail rail.
- [ ] Read Excel workbooks, with sheet tabs and formulas.
- [ ] Keep working offline once a reader has been used.
- [ ] Read every third-party license that ships inside the app.
- [x] Nothing native to install — the browser is the app.

