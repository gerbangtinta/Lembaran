export interface TextHit {
  start: number;
  end: number;
}

/**
 * Case-insensitive, non-overlapping hits inside one text node. Matches that straddle two
 * nodes are not found: docx-preview splits runs at every formatting change, and a query
 * that spans a bold boundary is not worth re-flowing the page for.
 */
export function findInText(text: string, query: string, limit = 500): TextHit[] {
  if (query.length === 0) return [];
  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();
  const hits: TextHit[] = [];
  let from = 0;
  while (hits.length < limit) {
    const at = haystack.indexOf(needle, from);
    if (at < 0) break;
    hits.push({ start: at, end: at + needle.length });
    from = at + needle.length;
  }
  return hits;
}

/** Wraps around the hit list, so "next" on the last hit returns to the first. */
export function stepHit(current: number, total: number, direction: 1 | -1): number {
  if (total <= 0) return -1;
  return (current + direction + total) % total;
}
