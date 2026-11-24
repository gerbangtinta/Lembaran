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
| XLSX | anything at all | no Excel reader is built yet |
| PDF | encrypted/password PDFs, forms, digital signatures | pdf.js supports some of this; none is wired |
| PDF | OCR of scanned pages | no OCR engine; text search returns nothing on an image-only PDF |
| All formats | render a document larger than available memory | viewport and page virtualization only go so far |

## Platform

| Area | Cannot do | Why |
| --- | --- | --- |
| iOS Safari | persist a file handle between visits | no File System Access API; the OPFS copy is the fallback |
| Firefox | pick files with the File System Access API | same; `<input type=file>` fallback |
| Any browser | run on a static host without COOP/COEP at full speed | threaded WASM needs them; single-threaded still works |
| Native | mobile and desktop apps | web only, by decision — no Tauri, Electron or Capacitor |

## Engineering

| Area | Cannot do yet | Why |
| --- | --- | --- |
| Tests | no cross-app e2e | arrives with the assembly chunk (E) |
| Weight | no CI budget enforcement | arrives with the foundation chunk (A) |
