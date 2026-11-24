# Vertical slices — where code goes

Lembaran borrows Sanggar.Editor's shape. **A capability is one folder under `feature/` holding its own
store, its own actions and its own selectors. A pixel is in `presentations/`, and the part of it that
draws is separated from the part that composes.**

This is not decoration. It is the reason a reader can be changed without reading the other four, and
the reason a GUI can be replaced without touching the engine.

## A reader

```
Lembaran.Pdf/
├── index.html                 standalone SPA entry
├── vite.config.ts             its own build → dist/pdf/
└── src/
    ├── main.tsx               boot: read the URL, choose a shell, render
    ├── App.tsx                desktop shell | mobile shell — the only place that picks
    ├── adapter.ts             ReaderAdapter: thin, mounts App into an element
    ├── theme.ts               this reader's tokens, composed from the framework's
    ├── state/                 state that is not one feature's: the open document, selection
    │   ├── document.ts        the handle, page count, current page
    │   └── selectors.ts
    ├── storage/               what this reader persists itself (last page, zoom)
    ├── feature/<name>/        ONE capability, self-contained
    │   ├── index.ts           its public surface — the only thing other folders import
    │   ├── store.ts           its state
    │   ├── actions.ts         what the UI may ask for
    │   ├── selectors.ts       derived reads
    │   └── *.test.ts          its tests, next to it
    └── presentations/
        ├── layout/            the page: shells, splitters, the scroll container
        │   └── viewport/      the drawing surface itself (canvas, text layer)
        ├── component/         composed pieces, grouped by domain
        ├── library/           primitives with no product knowledge: buttons, fields, icons
        ├── ui/                toolbars, dialogs, status bars
        └── mobile/            the phone's shell, overlays and stylesheet
```

Concretely, PDF's slices: `feature/open`, `feature/paginate`, `feature/zoom`, `feature/search`.
PPTX's: `feature/open`, `feature/slides`, `feature/notes`. XLSX's: `feature/open`, `feature/sheets`,
`feature/formula-bar`. CSV's: `feature/open`, `feature/grid`, `feature/delimiter`.

## The hub

```
Lembaran.App/src/
├── main.tsx
├── App.tsx                    desktop shell | mobile shell
├── state/
├── feature/
│   ├── choose/                the reader registry and the selection
│   ├── embed/                 iframe host + the OPFS handoff
│   └── recents/               what was opened before
└── presentations/
    ├── layout/HubShell.tsx
    ├── component/ReaderCard.tsx, ReaderFrame.tsx
    ├── library/
    ├── ui/LicensesDialog.tsx
    └── mobile/
```

## Rules

- **`feature/<name>/index.ts` is a wall.** Another feature imports from it, never from its internals. A
  feature that needs another's data asks a selector, not its store.
- **`presentations/` draws; `feature/` decides.** No `Math.hypot` over page geometry in a `.tsx`; no DOM
  in a store. A component reads a selector and calls an action.
- **`presentations/library/` has no product knowledge.** It never knows what a PDF is. If a control
  needs to know, it belongs in `ui/` or `component/`.
- **One shell per platform, not a responsive branch.** `presentations/mobile/` owns the phone's header,
  gestures, overlays and stylesheet. A desktop layout does not grow an `if (isPhone)`. `App.tsx` hands
  the same tree to one shell or the other.
- **A new capability is a new folder, not a new `if`.** Adding "fit width" to PDF is `feature/zoom/`;
  adding notes to PPTX is `feature/notes/`.
- **A slice is tested where it lives.** `feature/zoom/store.test.ts`, beside `store.ts`.
- **The engine is not a feature.** Parsing and layout live in `feature/<name>/` or in the framework's
  worker layer; the drawing surface lives in `presentations/layout/viewport/`. They meet at a typed
  boundary, which is why an engine can be swapped.
