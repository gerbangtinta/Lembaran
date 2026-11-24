# Limitations

What Lembaran cannot do yet, by area. This is not a roadmap — it is the honest list an agent reads so
it does not promise a capability the app does not have.

## Reading

| Area | Cannot do | Why |
| --- | --- | --- |
| All formats except PDF | edit, annotate, or save changes back | the PDF reader is the only one in edit mode so far |
| PDF | edit text inside the existing content stream | what is built is **cover-and-replace**: the picked run's box gets an opaque patch and the new words are written over it. The old glyphs stay in the content stream — still extractable and still found by search — and `Tj`/`TJ` surgery (which would need the run's operator and a font that covers the new characters) is not built |
| PDF | replace text in the original font, or on a quarter-turned page in the run's direction | a replacement is drawn with an embedded standard face (Helvetica, WinAnsi only), so characters outside Latin-1 become `?`; on a page turned 90° the patch matches the run but the new words are written horizontally into the run's narrow box and wrap |
| PDF | rotate a placed text box, picture or signature | the frame moves and resizes; there is no rotate handle, so a sideways placement is only possible by baking the page turned |
| PDF | save over the original without a file handle | Firefox and iOS have no File System Access; there the same bytes go to a copy through the save picker, and the reader says so |
| PDF | keep a signature, a form field or a tagged-PDF structure intact across a save | the save rewrites the document; a signed file is re-written without its signature, and encrypted PDFs are refused |
| PDF | make a stamp a *vector* or selectable text in the file | a composed stamp is drawn at 4× into a transparent PNG and placed as a picture: sharp at its printed size, but it is one image, not text runs — editing its words means reopening the design and stamping again |
| PDF | reach a compression target below the size of the document's own text | the size ladder stops at its smallest pass (photos at 35%, 800 px) and the dialog says what it did reach: the words, the vector lines and the page structure are never turned into pixels, so they are the floor |
| PDF | recompress every kind of image | only `DCTDecode` JPEGs with no mask and no CMYK colour space are re-encoded; JPX or Flate images, masks and spot colours are left exactly as they are, and counted as untouched |
| PDF | select text accurately on a page the reader rotated | the page is re-drawn turned inside a form XObject, so pdf.js reports the runs in the turned space and the text layer is approximate |
| PDF | fill a whole document with overlays above roughly 150 MB | pdf-lib holds the document in memory; there is no streaming writer |
| PDF | shape a placed text box to its content | resizing changes the box the file wraps to, but the box does not grow by itself when the words need more room; text beyond the box is drawn, not clipped, in both the reader and the file |
| PDF | undo a save | the record is cleared once the baked bytes are written, and the saved file becomes the new baseline |
| PDF (phone) | place text, images or ink | the tools are on the desk first; the phone shell still reads, searches and highlights |
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
