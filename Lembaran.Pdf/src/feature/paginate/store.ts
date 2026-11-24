/** Placeholder height while a page has not been rendered yet. Roughly ISO A4. */
export const PAGE_ASPECT = 1.4142;

/**
 * Which page the reader is looking at, given every page's offset from the top of
 * the scroll container. `slack` keeps the answer stable when a page boundary sits
 * right at the top edge.
 */
export function pageAtOffset(offsets: readonly number[], scrollTop: number, slack = 8): number {
  let page = 1;
  for (let index = 0; index < offsets.length; index += 1) {
    const top = offsets[index] ?? 0;
    if (top <= scrollTop + slack) page = index + 1;
    else break;
  }
  return page;
}

/** Scroll offset that puts a page near the top of the container. */
export function offsetForPage(offsets: readonly number[], page: number, margin = 12): number {
  const index = Math.max(0, Math.min(offsets.length - 1, page - 1));
  return Math.max(0, (offsets[index] ?? 0) - margin);
}
