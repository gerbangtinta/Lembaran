import { findInText } from './matches';

const HIT = 'docs-hit';
const ACTIVE = 'docs-hit-active';

/**
 * Splits the text nodes the search touched and wraps each hit in a `<mark>`. Text nodes
 * are addressed directly instead of re-rendering the page: the document's own markup —
 * revisions, footnotes, table structure — must survive a search untouched.
 */
export function highlightHits(root: HTMLElement, query: string): HTMLElement[] {
  clearHighlights(root);
  if (query.length === 0) return [];

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.nodeValue && node.nodeValue.trim().length > 0 && !isInMark(node)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT,
  });

  const texts: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) texts.push(node as Text);

  const marks: HTMLElement[] = [];
  for (const text of texts) {
    const value = text.nodeValue ?? '';
    const hits = findInText(value, query);
    if (hits.length === 0) continue;

    const fragment = document.createDocumentFragment();
    let cursor = 0;
    for (const hit of hits) {
      if (hit.start > cursor) fragment.append(value.slice(cursor, hit.start));
      const mark = document.createElement('mark');
      mark.className = HIT;
      mark.textContent = value.slice(hit.start, hit.end);
      marks.push(mark);
      fragment.append(mark);
      cursor = hit.end;
    }
    if (cursor < value.length) fragment.append(value.slice(cursor));
    text.replaceWith(fragment);
  }

  return marks;
}

export function clearHighlights(root: HTMLElement): void {
  for (const mark of root.querySelectorAll(`mark.${HIT}, mark.${ACTIVE}`)) {
    mark.replaceWith(mark.textContent ?? '');
  }
  root.normalize();
}

/** Marks one hit as current and brings it into view without jumping the whole page. */
export function activateHit(marks: HTMLElement[], index: number): void {
  marks.forEach((mark, at) => mark.classList.toggle(ACTIVE, at === index));
  marks[index]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function isInMark(node: Node): boolean {
  const parent = node.parentElement;
  return parent !== null && parent.tagName === 'MARK';
}
