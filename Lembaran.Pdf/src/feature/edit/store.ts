import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  dropEdits,
  loadEdits,
  saveEdits,
  type EditItem,
  type NewEditItem,
  type PagePlan,
  type PdfEdits,
} from '../../storage/edits';
import {
  clampDisplay,
  deleteSourcePage,
  displayPages,
  emptyPlan,
  insertBlank,
  moveSourcePage,
  removeBlank,
  rotateSourcePage,
  type DisplayPage,
} from './model';

const WRITE_DELAY = 300;
const HISTORY_LIMIT = 50;

interface State {
  plan: PagePlan;
  items: EditItem[];
}

export interface PdfEditApi {
  /** the record as it will be written: order, rotations and blanks */
  plan: PagePlan;
  /** the sequence the reader draws */
  pages: DisplayPage[];
  items: EditItem[];
  /** true once the record differs from what was loaded or last saved */
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  pageOfDisplay(display: number): number | null;
  itemsOnPage(source: number): EditItem[];
  deletePage(source: number): void;
  rotatePage(source: number, delta: 90 | -90): void;
  movePage(from: number, to: number): void;
  insertBlankPage(at: number, size: { width: number; height: number }): void;
  /** take out a page the record invented */
  removeBlankPage(id: string): void;
  addItem(item: NewEditItem): EditItem | null;
  updateItem(id: string, patch: Partial<EditItem>): void;
  removeItem(id: string): void;
  undo(): void;
  redo(): void;
  /** forget everything recorded for this document (after a save baked it into the bytes) */
  clear(): void;
}

function newId(prefix: string): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function fingerprint(state: State): string {
  return JSON.stringify(state);
}

/**
 * Everything the reader will write into the file, kept out of the file until then.
 *
 * The record is small — a page order, a rotation per page, and a list of placed items — so undo keeps whole
 * states rather than writing an inverse for each of the four item kinds. Every change goes through one commit
 * path, which is also where the history and the dirty flag come from.
 */
export function usePdfEdits(docKey: string, numPages: number): PdfEditApi {
  const [state, setState] = useState<State>(() => ({ plan: emptyPlan(numPages), items: [] }));
  /** the state every mutator reads: a whole state lives in a ref so two commits in one tick compose */
  const currentState = useRef<State>(state);
  const baseline = useRef(fingerprint(state));
  const past = useRef<State[]>([]);
  const future = useRef<State[]>([]);
  const writable = useRef(false);
  const pending = useRef<number | undefined>(undefined);
  const [, bump] = useState(0);

  const apply = useCallback((next: State) => {
    currentState.current = next;
    setState(next);
  }, []);

  /**
   * The one commit path. The history is updated here, outside the state updater: a side effect inside an
   * updater runs once per React invocation (twice under StrictMode), which pushed the same state twice and
   * made the first Undo look like nothing happened.
   */
  const commit = useCallback(
    (produce: (current: State) => State) => {
      const before = currentState.current;
      const next = produce(before);
      if (next === before || (next.plan === before.plan && next.items === before.items)) return;
      past.current = [...past.current, before].slice(-HISTORY_LIMIT);
      future.current = [];
      writable.current = true;
      apply(next);
      bump((value) => value + 1);
    },
    [apply],
  );

  // load (or reset) when the document changes
  useEffect(() => {
    let cancelled = false;
    past.current = [];
    future.current = [];
    const fresh: State = { plan: emptyPlan(numPages), items: [] };
    apply(fresh);
    baseline.current = fingerprint(fresh);
    writable.current = false;
    if (!docKey) return () => undefined;
    void loadEdits(docKey)
      .then((row) => {
        if (cancelled || !row) return;
        const loaded: State = { plan: row.plan, items: row.items };
        apply(loaded);
        baseline.current = fingerprint(loaded);
        bump((value) => value + 1);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [apply, docKey, numPages]);

  // the page count can arrive after the key: widen an untouched plan to cover the document
  useEffect(() => {
    const known = currentState.current.plan.order.length;
    if (!writable.current && known < numPages && currentState.current.plan.blanks.length === 0) {
      const next = { plan: emptyPlan(numPages), items: currentState.current.items };
      baseline.current = fingerprint(next);
      apply(next);
    }
  }, [apply, numPages]);

  useEffect(() => {
    if (!docKey || !writable.current) return;
    if (pending.current !== undefined) window.clearTimeout(pending.current);
    pending.current = window.setTimeout(() => {
      const row: PdfEdits = { docKey, plan: state.plan, items: state.items, updatedAt: Date.now() };
      void saveEdits(row).catch(() => undefined);
    }, WRITE_DELAY);
    return () => {
      if (pending.current !== undefined) window.clearTimeout(pending.current);
    };
  }, [docKey, state]);

  const pages = useMemo(() => displayPages(state.plan, numPages), [state.plan, numPages]);
  const dirty = fingerprint(state) !== baseline.current;

  const byPage = useMemo(() => {
    const map = new Map<number, EditItem[]>();
    for (const item of state.items) {
      const list = map.get(item.page);
      if (list) list.push(item);
      else map.set(item.page, [item]);
    }
    return map;
  }, [state.items]);

  return {
    plan: state.plan,
    pages,
    items: state.items,
    dirty,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    pageOfDisplay: (display) => pages[clampDisplay(pages, display) - 1]?.source ?? null,
    itemsOnPage: (source) => byPage.get(source) ?? [],
    deletePage(source) {
      commit((current) => ({ ...current, plan: deleteSourcePage(current.plan, source) }));
    },
    rotatePage(source, delta) {
      commit((current) => ({ ...current, plan: rotateSourcePage(current.plan, source, delta) }));
    },
    movePage(from, to) {
      commit((current) => ({ ...current, plan: moveSourcePage(current.plan, from, to) }));
    },
    insertBlankPage(at, size) {
      commit((current) => ({ ...current, plan: insertBlank(current.plan, at, size) }));
    },
    removeBlankPage(id) {
      commit((current) => ({ ...current, plan: removeBlank(current.plan, id) }));
    },
    addItem(item) {
      const created = { ...item, id: newId(item.kind === 'ink' ? 'i' : item.kind === 'image' ? 'm' : 't') } as EditItem;
      commit((current) => ({ ...current, items: [...current.items, created] }));
      return created;
    },
    updateItem(id, patch) {
      commit((current) => ({
        ...current,
        items: current.items.map((item) => (item.id === id ? ({ ...item, ...patch } as EditItem) : item)),
      }));
    },
    removeItem(id) {
      commit((current) => ({ ...current, items: current.items.filter((item) => item.id !== id) }));
    },
    undo() {
      const previous = past.current.at(-1);
      if (!previous) return;
      past.current = past.current.slice(0, -1);
      future.current = [currentState.current, ...future.current].slice(0, HISTORY_LIMIT);
      writable.current = true;
      apply(previous);
      bump((value) => value + 1);
    },
    redo() {
      const next = future.current[0];
      if (!next) return;
      future.current = future.current.slice(1);
      past.current = [...past.current, currentState.current].slice(-HISTORY_LIMIT);
      writable.current = true;
      apply(next);
      bump((value) => value + 1);
    },
    clear() {
      const fresh: State = { plan: emptyPlan(numPages), items: [] };
      past.current = [];
      future.current = [];
      baseline.current = fingerprint(fresh);
      apply(fresh);
      // nothing to persist: the record is gone, and the next real edit turns writing back on
      writable.current = false;
      if (docKey) void dropEdits(docKey).catch(() => undefined);
      bump((value) => value + 1);
    },
  };
}
