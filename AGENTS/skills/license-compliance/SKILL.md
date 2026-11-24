---
name: license-compliance
description: >
  Keeping Lembaran's dependency licenses correct and disclosed. USE FOR: adding, upgrading, vendoring
  or removing any dependency; writing or reviewing FRAMEWORK.md, THIRD-PARTY-NOTICES.md, NOTICE or
  LICENSES/; deciding whether a license is acceptable; placing an OFL font or a copyleft notice where
  it is actually served; answering "what license is this and what do we owe". DO NOT USE FOR: naming
  the project's own license, or a dependency change that alters no code and no version.
license: Apache-2.0
---

# License compliance

A dependency is not adopted until its license is **recorded**, its text is **present where the
artifact is served**, and anything it obliges us to say is **said**. A license that exists only inside
`node_modules` has not been disclosed.

## Before adding anything

1. Resolve the license from the registry, not from a README badge: `license` field on the published
   version, cross-checked against the `LICENSE` file in the tarball.
2. Classify it with the table below. If it is copyleft, **stop and bring an ADR** — do not merge first.
3. Reject any package that is **binary-only or minified-only with closed source**, whatever the field
   says. `pptx-preview` was rejected exactly this way: free to use on npm, source not open.
4. Measure the payload (raw → gzip) and pin the version.
5. Add the row to `FRAMEWORK.md` and the section to `THIRD-PARTY-NOTICES.md` in the same commit.

## What each class owes

| Class | Examples in this repo | Obligation |
| --- | --- | --- |
| Permissive | MIT (`papaparse`, `react`), Apache-2.0 (`pdfjs-dist`, `@betteroffice/*`), BSD-2 | Keep the copyright notice and license text; state changes if we modify the source |
| Weak copyleft | MPL-2.0, LGPL | As above, plus record **which files we modified** and keep those files separable |
| Strong copyleft | GPL-3.0, AGPL-3.0 | Whole-work disclosure. **AGPL adds the network clause**: serving the combined work over HTTP triggers it. ADR required before merge. |
| Asset licenses | OFL-1.1 fonts | Ship the OFL text **beside the font files**, keep the reserved font names, do not rename the family |

## Where the texts go

| Location | What lives there |
| --- | --- |
| `LICENSE` | our own license (Apache-2.0) |
| `NOTICE` | attribution we are required to propagate |
| `LICENSES/<SPDX>.txt` | verbatim full text of every license in the dependency tree |
| `AGENTS/FRAMEWORK.md` | the register: engine, version, license, measured size, why chosen |
| `THIRD-PARTY-NOTICES.md` | generated: one section per dependency, grouped by license, "vendored/modified?" flag |
| `THIRD-PARTY-NOTICES.md` in a package | anything bundled into that package's `dist/` |
| `dist/<x>/` served assets | for a bundled OFL font, its OFL text next to the font files |
| in-app attribution dialog | generated at build time from the notices manifest, so an offline user can read it |

Copy the **full text**, never a link, and never a summary. The served artifact is what must carry it.

## Rules that are not negotiable

- No dependency without a `FRAMEWORK.md` row and a notices section. `npm run licenses:check` enforces it.
- No AGPL/GPL addition without an ADR that says so plainly and names what gets disclosed.
- No binary-only or minified-only dependency.
- A version bump re-measures the payload and re-reads the license in the same commit — a license can
  change between versions.
- A transitive dependency counts. If it lands in `dist/`, it is ours to disclose.

## Answering the question

When asked "can we use X", answer in this order: the license and its class, the obligation in one
sentence, the payload, what it would cost us, and the recommendation. If the honest answer is "legal,
but it re-licenses the whole app", say that first.
