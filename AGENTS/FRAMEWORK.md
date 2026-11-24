# Framework Register

Every framework and engine Lembaran depends on, with the license that binds it and the payload it actually ships, so weight and license obligations stay visible and auditable at a glance. All sizes below were measured by downloading the published tarballs and gzipping the exact files a browser receives — not copied from package metadata — and any row whose license is not permissive must have its full text in `LICENSES/` plus an entry in `THIRD-PARTY-NOTICES.md` before merge.

| Component | Framework / Engine | Version | License | Shipped size (raw → gzip) | Why this one |
|---|---|---|---|---|---|
| Lembaran itself | — | 0.1.0-alpha | **GPL-3.0-only** | — | Strong copyleft chosen for the app (see `docs/adr/0001-adopt-copyleft-license.md`); every dependency below is permissive, so the combination is permitted and their notices are retained |
| Shell / UI | `react` + `react-dom` | 19.3.1 | MIT | 0.62 MB → 0.11 MB | No UI kit, ~100-line router; the only library hub and readers share |
| Worker RPC | `comlink` | 4.4.2 | Apache-2.0 | 5 KB → 2 KB | Typed main↔worker messaging; keeps every engine off the UI thread |
| Handle store | `dexie` | 4.4.7 | Apache-2.0 | 94 KB → 30 KB | Persists `FileSystemFileHandle` across reloads (the Lakaran pattern) |
| PDF engine | `pdfjs-dist` | 6.5.438 | Apache-2.0 | 1.71 MB → 0.50 MB | Reference renderer; text layer + search for free |
| CSV parser | `papaparse` | 5.7.1 | MIT | 19 KB → 7 KB | Streaming, quote-safe, delimiter sniffing |
| DOCX engine | `@betteroffice/docx` | 0.5.1 | Apache-2.0 | 10.65 MB → 4.03 MB | **Held, not installed.** Its renderer lives in the editing module, so the read-only reader would carry an editor's weight; measured for the record, no project imports it |
| DOCX reader | `docx-preview` | 0.4.1 | Apache-2.0 | 73.5 KB → 40 KB | Lays real OOXML out as pages in HTML: page breaks, headers, footnotes, tables. Measured reader bundle: 496 KB raw → **148.8 KB gzip** including React |
| DOCX archive | `jszip` | 3.10.2 | **MIT OR GPL-3.0-or-later** (MIT taken) | 95.5 KB → 33 KB | Transitive dependency of docx-preview; both license options are recorded here, the permissive one is the one exercised |
| XLSX engine | `@betteroffice/xlsx` | 0.5.1 | Apache-2.0 | 7.23 MB → 2.84 MB | **Held, not installed.** Sheet model + formula calc + canvas paint in one engine; arrives with the Excel reader |
| PPTX engine | `@betteroffice/pptx` | 0.5.1 | Apache-2.0 | 6.01 MB → 2.34 MB | Only maintained permissive PPTX renderer that is embeddable. **Ships**: reader 391.6 KB → 117.4 KB gzip, layout worker 163.2 KB → 43.7 KB gzip, WASM 6.15 MB → **2.34 MB gzip**, no font request |
| Office fonts | `@betteroffice/fonts` | 0.4.2 | Apache-2.0 AND **OFL-1.1** | 14.9 MB / 96 faces; 0.4–0.8 MB per face, lazy | **Held, not installed.** Metric-compatible with MS core fonts so pagination matches; self-host before a reader needs exact metrics |
| CJK fonts | `@betteroffice/fonts-cjk` | 0.4.2 | Apache-2.0 AND **OFL-1.1** | 34 MB unpacked, sliced + lazy | Only fetched when a document references CJK. Not installed |
| Service worker | `workbox-build` | 7.4.1 | MIT | build-generated | Precache + offline shell |
| Build | `vite` | 8.3.8 | MIT | build only | Per-format SPA builds, content-hashed WASM |
| Monorepo | npm workspaces | — | — | build only | Root scripts fan out across `Lembaran`, `Lembaran.App` and every `Lembaran.<Format>` |
| Language | `typescript` | 7.0.2 | Apache-2.0 | build only | Type-safe adapter contract across the worker boundary |
| Tests | `vitest` / `@playwright/test` | 5.1.1 / 1.65.1 | MIT / Apache-2.0 | build only | Unit + per-app e2e including mobile viewports |

**Totals:** a single reader ships **0.10–2.50 MB gzip** (PDF 0.23 + a 0.37 worker, CSV 0.11, DOCX 0.15, PPTX 2.50 including its 2.34 MB WASM; XLSX is not built). The installed tree carries **8 third-party dependencies**; every one has a row here, a license text in `LICENSES/`, and an entry in `THIRD-PARTY-NOTICES.md` generated from what is installed.

**Rejected, for the record:** LibreOffice→WASM (GPL-3.0/LGPLv3/MPL-2.0 — 300 MB+, dead browser ports), ONLYOFFICE `sdkjs` (AGPL-3.0 — network clause reaches the whole work), Collabora Online (MPL-2.0 — server architecture), `pptx-preview` (ISC on npm but **minified-only, non-open source**), `hyperformula` (GPL-3.0-only — the license objection lapsed when the app itself became GPL-3.0-only, but it is still unbudgeted and `@betteroffice/xlsx` covers formulas), MuPDF (AGPL-3.0 — stricter than GPLv3 and would re-license the served work). None buy measurable speed in a browser, where runtime is dominated by download and compile rather than source language.
