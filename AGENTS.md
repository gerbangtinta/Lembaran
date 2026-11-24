# Lembaran — instructions for AI

This project is built to be **driven by an AI**. Everything below is the contract: what the model may
assume, what it must not do, and how to find out rather than guess.

## What Lembaran is

A **local-only document reader in the browser**. No server, no upload, no telemetry, no native app.
Files are opened through the File System Access API, kept in OPFS, and rendered entirely client-side.
Static hosting only: the whole product is a `dist/` folder.

Five formats, each its own project with its own logic **and its own GUI**: PDF, DOCX, PPTX, XLSX, CSV.
`lembaran.app` is the hub — a format selector and, in production, an iframe host.

## Start here

Everything beyond this contract lives in [`AGENTS/`](AGENTS/), and the first file there is not
optional:

- [`AGENTS/skills/lembaran/SKILL.md`](AGENTS/skills/lembaran/SKILL.md) — **read before any change**:
  confirm a checklist before implementing, the two changelogs, the size budget, the worker boundary,
  the per-format GUI rule, the gates.
- [`AGENTS/skills/license-compliance/SKILL.md`](AGENTS/skills/license-compliance/SKILL.md) — read
  before adding, upgrading or vendoring **any** dependency.
- [`AGENTS/skills/planning-annotations/SKILL.md`](AGENTS/skills/planning-annotations/SKILL.md) — read
  before writing a plan: every plan annotates framework, license, use case and plumbing.
- [`AGENTS/PLAN.md`](AGENTS/PLAN.md) — the masterplan and its open milestones.
- [`AGENTS/CHANGELOG-DEV.md`](AGENTS/CHANGELOG-DEV.md) — what moved, by date.
- [`AGENTS/DEVNOTES.md`](AGENTS/DEVNOTES.md) — what is true now.
- [`AGENTS/LIMITATION.md`](AGENTS/LIMITATION.md) — what it cannot do yet, by area.
- [`FRAMEWORK.md`](AGENTS/FRAMEWORK.md) — every engine, version, license and measured size.

## The rules

**1. Confirm before implementing.** Write the plan back in the user's own terms — what it does,
definition of done, fallback, the test that proves it, the files it touches — then stop and ask. A
frustrated message is not permission to skip this.

**2. Two changelogs, both every feature.** `CHANGELOG.md` by version, in the user's terms.
`CHANGELOG-DEV.md` by date, in the code's terms, with the files and the numbers. A feature in neither
file is not finished.

**3. Each format owns its logic and its GUI.** `Lembaran` supplies primitives — file access,
OPFS, worker RPC, theme tokens, error boundary. It never supplies a toolbar, page navigation, slide
strip, sheet tabs or grid. Those live in `Lembaran.<Format>/src/gui/`.

**4. Nothing leaves the browser.** No network request at runtime except same-origin assets. Fonts are
self-hosted; the engine's CDN default is overridden. A CDN call is a bug, and the e2e suite asserts
zero external requests.

**5. Kernels run in a worker.** No engine touches the main thread. Bytes move as transferables, never
copies. The adapter contract is the only door.

**6. Weight is a feature.** Read-only payloads are published in `FRAMEWORK.md` and measured, not
estimated. A change that grows a first load must say by how much.

**7. License integrity is not optional.** Every dependency is recorded, every license text is in
`LICENSES/`, and anything requiring disclosure has it placed where it is actually served. No
binary-only dependency, ever.

## Do not

- Do not add a native shell (Tauri, Electron, Capacitor). This is HTML only.
- Do not add a dependency with an unrecorded license, or an AGPL/GPL one without an ADR.
- Do not import a format adapter from the hub's production bundle.
- Do not put a format's chrome into `Lembaran`.
- Do not rewrite an older day in `CHANGELOG-DEV.md`; append, and reverse with a `Reverted:` line.
