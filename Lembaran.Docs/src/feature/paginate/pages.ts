/**
 * Which page the reader is looking at, from page tops measured in the scroll container:
 * the page whose top edge has passed the top of the viewport is the page being read.
 */
export function currentPage(tops: number[], viewportTop: number): number {
  if (tops.length === 0) return 0;
  let page = 0;
  for (let index = 0; index < tops.length; index += 1) {
    const top = tops[index];
    if (top === undefined || top > viewportTop) break;
    page = index;
  }
  return page;
}

/** One-based page count for display, with a zero-page document reading as 0 / 0. */
export function pageLabel(page: number, total: number): string {
  return total <= 0 ? '0 / 0' : `${page + 1} / ${total}`;
}
