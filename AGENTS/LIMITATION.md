# Limitations

What Lembaran cannot do yet, by area. This is not a roadmap — it is the honest list an agent reads so
it does not promise a capability the app does not have.

## Reading

| Area | Cannot do | Why |
| --- | --- | --- |
| All formats | edit, annotate, or save changes back | read-only milestone; no engine is in edit mode |
| All formats | print except via the browser's own print dialog | no print pipeline is built |
| DOCX | split a page at the height the source document intended (a page only breaks where the file says so, or where docx-preview reflows a long page) | docx-preview breaks on explicit and recorded page breaks, not on measured page height |
| DOCX | find a phrase that spans two formatting runs (e.g. "ban**ana**") | search runs per text node; formatting splits the node |
| DOCX | legacy `.doc`, macro documents, tracked-change review UI | engine reads OOXML only |
| PPTX | legacy `.ppt`, animations, transitions, embedded video playback | the engine paints a static slide |
| PPTX | speaker notes and in-deck search | the snapshot carries `notes` and the handle has `findText`; the reader shows neither yet |
| XLSX | edit cells, save, run macros, recalculate on demand | read-only reader; formulas are calculated when the file opens, `.xlsm` opens but its VBA never runs |
| XLSX | the legacy binary `.xls` format, pivot tables, conditional-format editing | the engine reads OOXML; the reader has no editing surface |
| PDF | encrypted/password PDFs, forms, digital signatures | pdf.js supports some of this; none is wired |
| PDF | OCR of scanned pages | no OCR engine; text search returns nothing on an image-only PDF |
| All formats | render a document larger than available memory | viewport and page virtualization only go so far |
| All formats | reproduce Calibri/Arial/Times/Verdana exactly | those fonts are proprietary and are never bundled or served; open substitutes stand in (Carlito, Liberation Sans/Serif, DejaVu Sans). The first three are metric-compatible, so pagination holds; **DejaVu Sans is only an approximation of Verdana** |
| All formats | fall back to a substitute for every typeface a document might name | only the six Microsoft core families are aliased; a document using a brand font (e.g. Roboto, Aptos, a corporate face) is drawn with whatever the machine or the engine has |
| All formats | CJK, Indic, Arabic or Hebrew shaping | no CJK/shingle font is bundled and no shaping engine is wired; those runs fall back to system faces, and `@betteroffice/fonts-cjk` is deliberately not installed |

## Platform

| Area | Cannot do | Why |
| --- | --- | --- |
| iOS Safari | persist a file handle between visits | no File System Access API; the OPFS copy is the fallback |
| Firefox | pick files with the File System Access API | same; `<input type=file>` fallback |
| Any browser | run on a static host without COOP/COEP at full speed | threaded WASM needs them; single-threaded still works |
| Native | mobile and desktop apps | web only, by decision — no Tauri, Electron or Capacitor |
| Any browser | open a file from OneDrive or Google Drive, keep it in sync with the drive, or save back to it | not built. Named for a later version in [PLAN.md § F](PLAN.md) and designed in [ARCHITECTURE.md § Cloud drives](ARCHITECTURE.md); today a document arrives only as a picked file, a drop, or the OPFS copy |
| Any browser | read a document while Lembaran is off the network, from a drive account | no cloud source exists yet, so nothing is cached from one; local files already work offline |
| Firefox, iOS Safari | keep a bound folder between sessions | no directory-handle API; the folder is picked with `<input webkitdirectory>` and the listing is gone after a reload, which the panel says in place. Subfolders are still listed there, because the input walks the tree |
| All formats | list a subtree deeper than 8 levels, or more than 300 files in a bound folder | the walk is deliberately shallow and capped: a launcher shows a document library, not a disk. Both limits are constants in `Lembaran/src/folders/entries.ts` |

## Engineering

| Area | Cannot do yet | Why |
| --- | --- | --- |
| Tests | no cross-app e2e | arrives with the assembly chunk (E) |
| Weight | no size budget that fails a build | the GitHub Actions workflow runs the gates on every push and PR, but no budget is enforced yet |
