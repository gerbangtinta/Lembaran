import type { BlankPage, PagePlan, Rotation } from '../../storage/edits';

/** A4 in points: what a blank page is when the document has no page to copy a size from. */
export const A4 = { width: 595.28, height: 841.89 };

/** One entry of the sequence the reader draws: a source page, or a blank the record invented. */
export interface DisplayPage {
  /** stable React key — `s12` for source page 12, `b<id>` for a blank */
  key: string;
  /** 0-based position in the reader */
  display: number;
  /** 1-based source page, or null for a blank */
  source: number | null;
  rotation: Rotation;
  /** blank pages carry their own size, in points, and the record's id so one can be taken out again */
  width?: number;
  height?: number;
  blankId?: string;
}

export function emptyPlan(numPages: number): PagePlan {
  return {
    order: Array.from({ length: Math.max(0, numPages) }, (_, index) => index + 1),
    rotation: {},
    blanks: [],
  };
}

export function rotateBy(current: Rotation, delta: number): Rotation {
  const next = (((current + delta) % 360) + 360) % 360;
  return (next === 90 || next === 180 || next === 270 ? next : 0) as Rotation;
}

/**
 * The whole sequence: source pages in the recorded order with blanks dropped in at their position.
 * A record whose order does not fit the document (stale after a re-open, or empty) falls back to every
 * page, because a viewer that draws nothing looks broken rather than "edited".
 */
export function displayPages(plan: PagePlan, numPages: number): DisplayPage[] {
  const seen = new Set<number>();
  const order = plan.order.filter((page) => {
    if (!Number.isInteger(page) || page < 1 || page > numPages || seen.has(page)) return false;
    seen.add(page);
    return true;
  });
  const source = order.length > 0 || numPages === 0 ? order : emptyPlan(numPages).order;

  const blanks = [...plan.blanks].sort((left, right) => left.at - right.at);
  const pages: DisplayPage[] = [];
  const pushBlank = (blank: BlankPage) => {
    pages.push({
      key: `b${blank.id}`,
      display: pages.length,
      source: null,
      rotation: 0,
      width: blank.width,
      height: blank.height,
      blankId: blank.id,
    });
  };

  for (let position = 0; position <= source.length; position += 1) {
    for (const blank of blanks) if (blank.at === position) pushBlank(blank);
    const page = source[position];
    if (page === undefined) continue;
    pages.push({
      key: `s${page}`,
      display: pages.length,
      source: page,
      rotation: plan.rotation[page] ?? 0,
    });
  }
  return pages;
}

/**
 * The paper a display position shows, in points.
 *
 * A blank carries its own size; a source page takes the size pdf.js reports, turned with the page, so a page
 * rotated by a quarter is a landscape sheet rather than a portrait one squeezed into place. `null` means the
 * paper is not measured yet — the caller falls back to page 1's.
 */
export function displayBox(
  page: DisplayPage,
  source?: { width: number; height: number },
): { width: number; height: number } | null {
  if (page.source === null) {
    return { width: page.width ?? A4.width, height: page.height ?? A4.height };
  }
  if (!source) return null;
  const quarter = page.rotation === 90 || page.rotation === 270;
  return quarter ? { width: source.height, height: source.width } : { width: source.width, height: source.height };
}

/** The source page under a display position, or null when the position holds a blank. */
export function displayToSource(pages: readonly DisplayPage[], display: number): number | null {
  return pages[display]?.source ?? null;
}

/** Where a source page sits in the reader; -1 when it was deleted. */
export function sourceToDisplay(pages: readonly DisplayPage[], source: number): number {
  return pages.findIndex((page) => page.source === source);
}

/** 1-based display position, clamped to what exists — the page box and the rail both speak this. */
export function clampDisplay(pages: readonly DisplayPage[], display: number): number {
  if (pages.length === 0) return 1;
  return Math.min(pages.length, Math.max(1, Math.round(display)));
}

export function deleteSourcePage(plan: PagePlan, source: number): PagePlan {
  const position = plan.order.indexOf(source);
  if (position === -1 || plan.order.length <= 1) return plan;
  const rotation = { ...plan.rotation };
  delete rotation[source];
  return {
    ...plan,
    order: plan.order.filter((page) => page !== source),
    rotation,
    // a blank sitting after the removed page keeps its place in the reading order
    blanks: plan.blanks.map((blank) => (blank.at > position ? { ...blank, at: blank.at - 1 } : blank)),
  };
}

/** Takes a page the record invented out of the sequence; the source pages are untouched. */
export function removeBlank(plan: PagePlan, id: string): PagePlan {
  const blanks = plan.blanks.filter((blank) => blank.id !== id);
  return blanks.length === plan.blanks.length ? plan : { ...plan, blanks };
}

/** Drag a page somewhere else: the order is the sequence, so this is a splice and nothing more. */
export function moveSourcePage(plan: PagePlan, from: number, to: number): PagePlan {
  const order = [...plan.order];
  if (from < 0 || from >= order.length || to < 0 || to >= order.length || from === to) return plan;
  const [moved] = order.splice(from, 1);
  if (moved === undefined) return plan;
  order.splice(to, 0, moved);
  return { ...plan, order };
}

export function rotateSourcePage(plan: PagePlan, source: number, delta: number): PagePlan {
  const current = plan.rotation[source] ?? 0;
  return { ...plan, rotation: { ...plan.rotation, [source]: rotateBy(current, delta) } };
}

export function insertBlank(
  plan: PagePlan,
  at: number,
  size: { width: number; height: number },
): PagePlan {
  const clamped = Math.min(plan.order.length, Math.max(0, Math.round(at)));
  return {
    ...plan,
    blanks: [
      ...plan.blanks,
      {
        id: `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        at: clamped,
        ...size,
      },
    ],
  };
}
