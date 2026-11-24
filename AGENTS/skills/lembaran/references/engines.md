# Engines — what renders what, and why the rest was rejected

Measured 2026-11-24 from the published tarballs: raw → gzip for the files a browser actually receives.
Re-measure before contradicting a number here.

## Chosen

| Format | Engine | Version | License | Payload | Boundary |
| --- | --- | --- | --- | --- | --- |
| PDF | `pdfjs-dist` | 6.5.438 | Apache-2.0 | 1.71 MB → 0.50 MB | worker; canvas + text layer |
| DOCX | `@betteroffice/docx` | 0.5.1 | Apache-2.0 | 10.65 MB → 4.03 MB | worker; parse → layout → paint |
| PPTX | `@betteroffice/pptx` | 0.5.1 | Apache-2.0 | 6.01 MB → 2.34 MB | worker; `layoutSlide` → `paintSlide` |
| XLSX | `@betteroffice/xlsx` | 0.5.1 | Apache-2.0 | 7.23 MB → 2.84 MB | worker; `displayList(viewport)` → `paintDisplayList` |
| CSV | `papaparse` | 5.7.1 | MIT | 19 KB → 7 KB | worker parse; own virtualized grid |
| Fonts | `@betteroffice/fonts*` | 0.4.2 | Apache-2.0 AND OFL-1.1 | 14.9 / 34 MB, lazy per face | fetched same-origin, never a CDN |

## Traps that cost real time

- **`@betteroffice/docx` ships a 23.85 MB `edit` WASM next to the read-only set.** A reader must never
  fetch it; the network trace in the e2e suite is what proves it. If DOCX first load ever reads
  34.5 MB instead of 10.65 MB, something imported the edit entry point.
- **The engine's default font source is a CDN** (jsDelivr / Bunny). Overriding it is mandatory, not
  an optimisation. CSP `connect-src 'self'` is the tripwire.
- **Canvas display lists, not DOM.** Zoom and scroll are re-paints of a viewport, not CSS transforms;
  a full-document paint on mobile kills the tab. Paint what is visible.
- **Handles are not bytes.** A `FileSystemFileHandle` can be stored in IndexedDB and re-opened later;
  a `File` cannot be trusted to survive. Keep an OPFS copy of everything opened.

## Rejected, with the reason that decided it

| Candidate | License | Why not |
| --- | --- | --- |
| LibreOffice core → WASM | GPL-3.0 / LGPLv3 / MPL-2.0 | Browser ports are dead experiments (11★, 2★, last push 2022); 300 MB+ binary, virtual FS, multi-minute cold start. Not a PWA. |
| Collabora Online | MPL-2.0 | Server architecture; the WASM port is not production. |
| ONLYOFFICE `sdkjs` | AGPL-3.0 | Real renderer, built for DocumentServer; tens of MB standalone and the network clause reaches the whole work. |
| `pptx-preview` | ISC (npm) | **Minified only, source non-open.** Free to use is not open source. |
| `pptxjs` | MIT | Stale, low fidelity, no maintained fork. |
| `hyperformula` | GPL-3.0-only | Would put copyleft on the spreadsheet core; unnecessary once the engine calculates. |
| MuPDF | AGPL-3.0 | Commercial licence otherwise; pdf.js is Apache-2.0 and sufficient. |
| `docx-preview` | Apache-2.0 | Not rejected — held as the light fallback (0.02 MB gzip) if 4 MB is ever too much. Re-flows DOCX as HTML, so tables and floats drift. |
| SheetJS CE | Apache-2.0 | Parses XLSX but does not render it, so the grid is still ours to write. |

**A licence has no performance property.** C++→WASM is not automatically fast; in a browser the runtime
is download → compile → instantiate → startup, and the desktop-era GPL engines lose that race badly.
Their real advantage is fidelity on legacy `.doc`/`.xls`/`.ppt`, which is out of scope.
