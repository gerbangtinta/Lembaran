---
name: lembaran
description: >
  Building Lembaran — a local-only document reader in the browser. Five formats, each its own
  project with its own logic and GUI: PDF (pdf.js), DOCX / PPTX / XLSX (BetterOffice Rust/WASM),
  CSV (papaparse + own grid), behind a worker RPC adapter, opened through the File System Access API
  and stored in OPFS, shipped as a static PWA with no native app. USE FOR: any change to Lembaran —
  a reader, its toolbar, the adapter contract, the hub selector or iframe host, file access, OPFS,
  the service worker, weight or performance work, a license record, a milestone, a changelog entry,
  or a dev-notes refresh. DO NOT USE FOR: unrelated TypeScript, or a change that cannot affect what a
  reader shows or how it loads.
license: GPL-3.0-only
---

# Lembaran

A local-only document reader in the browser. The engines are the tool; each format's own reader is
the work.

The intended shape of the whole app — projects, packages and where a capability lands — is
[ARCHITECTURE](../../ARCHITECTURE.md). This skill is how to work inside it.

## Non-negotiables

**1. Say what you will do, then wait.** No implementation until the user has answered — and never
rewrite or delete something they asked for because you think it is the simpler fix. Before any edit,
write the plan back in **the user's own terms**, three to six lines, and stop:

- what it does, in one line;
- definition of done;
- fallback if it cannot be done as planned;
- the test that proves it;
- what files it touches.

Then ask "confirm, or add instructions" and **stop**. A frustrated or urgent message is not
permission to skip this — it is the moment the plan matters most. Implement only on a yes or an
amendment.

**2. Two changelogs, both every feature.** `AGENTS/CHANGELOG.md` records what shipped **by version**,
in the user's terms. `AGENTS/CHANGELOG-DEV.md` records what changed **by date**, in the code's terms,
with the files touched and the numbers that prove it. Append to both in the same turn as the change.
The version heading is the last one the user named — `0.1.0-alpha` today; never invent a number.

**3. Dev notes stay current.** `AGENTS/DEVNOTES.md` is what an agent reads before touching the app.
Update the sections the change touched, in the same edit. When the user says **summarize**, they mean
this document.

**4. One format at a time, in this order.** PDF → DOCX → PPTX → XLSX → CSV. A chunk is done when its
reader builds, its own Playwright spec passes, and it makes no external request. Do not start the next
format because the current one is "nearly there", and do not touch a second format in the same turn.

**5. Each format owns its logic *and* its GUI, as vertical slices.** Inside `Lembaran.<Format>/src/`:
`feature/<name>/` is one capability with its own store, actions and selectors; `presentations/` is
every pixel, split into `layout/` (shells and the drawing surface), `component/` (composed pieces),
`library/` (primitives that know nothing about documents), `ui/` (toolbars, dialogs) and `mobile/` (the
phone's own shell). `Lembaran` holds primitives only — file access, OPFS, worker RPC, theme
tokens, error boundary, the adapter contract. A toolbar, page control, slide strip, sheet tab bar or
grid added to the framework package is a defect. See [slices](references/slices.md); two readers
looking nothing alike is correct.

**6. Kernels run in a worker; the shell never parses.** Every engine sits behind `ReaderAdapter` over
Comlink. Transfer bytes, never copy them. The main thread composes UI only. `dispose()` every handle.
An engine reaching the main thread is a bug even when it renders correctly.

**7. Nothing leaves the browser.** Self-host fonts, CMaps, standard font data and WASM. Override any
engine CDN default. CSP `connect-src 'self'`; the e2e suite asserts zero external requests. If a
change makes a network call, it is wrong, whatever it fixes.

**8. Weight is published, not estimated.** `FRAMEWORK.md` holds measured raw and gzip payloads. A
dependency bump re-measures in the same commit. A change that grows a first load states by how much,
in the changelog bullet.

**9. License integrity.** Every dependency gets a `FRAMEWORK.md` row and a
`THIRD-PARTY-NOTICES.md` section. Every license text used lives in `LICENSES/`. Anything requiring
disclosure gets its text copied to where it is actually served — beside the font files for a bundled
OFL font, not into `node_modules`. AGPL/GPL needs an ADR first. No binary-only dependency. **The app
itself is `GPL-3.0-only`** (`docs/adr/0001-adopt-copyleft-license.md`): the dependencies stay under
their permissive licenses, and a served build must offer its Corresponding Source.

**10. The hub never imports a reader.** Dev and production both reach a reader through an iframe at its
own URL — one Vite server at the repo root in development, `/pdf/` in production. Nothing in
`Lembaran.App` imports a reader, so the hub bundle cannot grow one by accident, and the path that ships
is the path that is tested.

## The loop

1. Read [PLAN](../../PLAN.md), open version first. Do not invent work outside it without saying so.
2. Write the checklist (the five lines above) and read
   [planning-annotations](../planning-annotations/SKILL.md) if the work needs a framework choice.
3. **Ask for confirmation. Wait.**
4. Build the smallest slice that can be verified on its own.
5. Run the gates.
6. Append to both changelogs.
7. Update the dev notes sections the change touched.
8. Tick the box under the version the work ships in `PLAN.md`; strike through anything it superseded,
   with one line saying why.

## Gates

A change is not done until these pass, from the repository root:

```powershell
npm run typecheck
npm test
npm run licenses:check
npm run large-files:check
```

Run the tests of the packages touched; run all of them when a shared type moved. Add `npm run build` when
the change touches bundling, a worker, or the service worker — and check the hub bundle for adapter
references. A performance or weight claim without a before/after number is not a claim.

A code file at or above **1,000 lines** is recorded in [LARGEFILES](../../LARGEFILES.md) by
`npm run large-files`; a stale table fails the gate.

## References

| Read this | When |
| --- | --- |
| [workflow](references/workflow.md) | confirming a request, writing either changelog, refreshing the dev notes |
| [engines](references/engines.md) | touching a reader, choosing a library, or explaining why an engine was rejected |
| [ARCHITECTURE](../../ARCHITECTURE.md) | adding a project, package, folder, or moving code between them |
| [license-compliance](../license-compliance/SKILL.md) | adding, upgrading or vendoring any dependency |
| [planning-annotations](../planning-annotations/SKILL.md) | writing any plan |

The product contract — web only, per-format GUI, local-only, weight, licenses — is in
[AGENTS.md](../../../AGENTS.md) and the standing rules in
[copilot-instructions.md](../../../.github/copilot-instructions.md). This skill does not restate them;
it says how to work on them.
