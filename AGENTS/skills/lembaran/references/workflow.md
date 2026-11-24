# Workflow — planning, changelogs, dev notes

## Confirming a request

Before any edit, write this back in the user's own words and stop:

```
What it does:   <one line>
Done when:      <observable outcome>
Fallback:       <if it cannot be done as planned>
Proof:          <the test or measurement>
Touches:        <files or packages>
```

Then ask for confirmation and wait. An amendment is a yes.

## Which document gets what

| The user asked for | Write it in |
| --- | --- |
| "what can the app do" | `CHANGELOG.md`, under the open version, in their terms |
| "what changed today" | `CHANGELOG-DEV.md`, under today's date, in the code's terms |
| "where are we / summarize" | `DEVNOTES.md`, then answer: build, architecture, limitations, bugs |
| "what is next" | `PLAN.md`, boxes under the open version |
| "why is this not possible" | `LIMITATION.md`, under the area |

## Writing a `CHANGELOG-DEV.md` entry

Newest first. Never rewrite an older day. One bullet per change:

```
- **<what moved>** (<milestone id>). <Why it was needed, in one or two sentences, including the
  measurement that decided it.> Verified: <what was run, and the number before → after>.
  Files: `path/a.ts`, `path/b.ts`.
```

A defect found on the way gets its own bullet naming what was actually wrong, not what was planned.
A reversal gets `Reverted:` and keeps its reason — do not delete the original line.

## Writing a `CHANGELOG.md` entry

By version, in the user's terms. No file names, no function names, no package versions. "PDF pages can
be searched and the match is highlighted in place" is a changelog line; `pdfSearch.ts uses
PDFFindController` is not.

## Refreshing `DEVNOTES.md`

Keep these sections, in this order, and update only what the change touched:

1. **Build** — commands that work today.
2. **Architecture** — a short map, pointing at `ARCHITECTURE.md` for detail.
3. **Data flow** — how a file gets from the picker to pixels.
4. **Measured facts** — payload sizes, budgets, and the date they were measured.
5. **Known bugs** — each with how to see it.
6. **Traps** — things that look wrong but are deliberate.

## Ticking a milestone

Tick the box under the version where the work **finishes**, not where it started. A superseded rule
is struck through with one line saying why; the history stays.
