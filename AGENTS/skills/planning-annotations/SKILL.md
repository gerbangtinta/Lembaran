---
name: planning-annotations
description: >
  The annotation every Lembaran plan must carry before implementation. USE FOR: writing or reviewing
  AGENTS/PLAN.md milestones, a feature plan, a spike, or any proposal that introduces a framework,
  library, engine or build tool. DO NOT USE FOR: a plan with no new dependency and no new library —
  a bug fix inside one file still needs the confirm-and-wait rule, but not this table.
license: GPL-3.0-only
---

# Planning annotations

No plan is complete until every framework it proposes is annotated with **what it is, what license
binds it, what it is for, and how it is plumbed in**. A plan that says "use pdf.js" and stops is not a
plan — it is a wish that becomes a license problem two months later.

## The table every plan carries

One row per proposed framework, engine or tool:

| Column | Must answer |
| --- | --- |
| Component | which part of Lembaran it serves (`Lembaran.Pdf`, `Lembaran`, build) |
| Framework / engine | exact package name and version |
| License | SPDX id, verified from the published package — plus its class (permissive / weak / strong copyleft) |
| Size | measured raw → gzip, for what actually ships |
| Use case | the one job it does here. If it does two jobs, say both. |
| Plumbing | how it enters: which package, which folder, worker or main thread, who calls it, what replaces it |
| Rejected alternative | the one we did not choose and the reason — one line |

Then the four lines the working skill already requires:

```
What it does:   <one line>
Done when:      <observable outcome>
Fallback:       <if it cannot be done as planned>
Proof:          <the test or measurement>
```

## Rules

- **Measure, do not estimate.** A size in a plan is a number from a tarball, with the date it was
  measured. "About 2 MB" is not a number.
- **A license choice is a decision, not a detail.** If the answer is GPL/AGPL, the plan says what gets
  disclosed and that an ADR is required. If the license cannot be determined, the framework is not
  ready to be planned.
- **Name the fallback engine.** Every plan for a reader names the lighter or more permissive
  alternative and why it lost. This is what makes the choice reviewable instead of tribal.
- **Plumbing is part of the design.** Worker or main thread, which package, which boundary, who owns
  disposal. An engine "somewhere in the app" is how a main-thread layout pass appears later.
- **Weight is stated up front.** The plan says what the first load becomes for the affected reader, and
  whether that breaks the published budget.
- **Say what is deferred.** Native shells, editing, sync: name them as out of scope with one line, so
  no one re-litigates them mid-milestone.

## Where it goes

Into the milestone in `AGENTS/PLAN.md`, under the version where the work finishes. The table lives in
the milestone, not in a separate document that rots. When the work ships, the row moves into
`AGENTS/FRAMEWORK.md` and the milestone keeps its checked box.
