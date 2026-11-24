export const ROW_HEIGHT = 26;
export const COLUMN_WIDTH = 148;
export const GUTTER_WIDTH = 56;

export interface Range {
  first: number;
  last: number;
}

/**
 * The slice of rows worth rendering: what is on screen plus a small overscan, so
 * scrolling never shows a blank band and a million rows cost the same as a hundred.
 */
export function visibleRange(
  scrollTop: number,
  viewportHeight: number,
  rowCount: number,
  rowHeight: number = ROW_HEIGHT,
  overscan = 6,
): Range {
  if (rowCount <= 0 || viewportHeight <= 0) return { first: 0, last: -1 };
  const first = Math.min(
    Math.max(0, Math.floor(scrollTop / rowHeight) - overscan),
    rowCount - 1,
  );
  const last = Math.min(rowCount - 1, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan);
  return { first, last };
}

/** 0 → A, 25 → Z, 26 → AA. Spreadsheet column labels, not numbers. */
export function columnName(index: number): string {
  let remaining = index;
  let name = '';
  do {
    name = String.fromCharCode(65 + (remaining % 26)) + name;
    remaining = Math.floor(remaining / 26) - 1;
  } while (remaining >= 0);
  return name;
}

export function visibleColumns(
  scrollLeft: number,
  viewportWidth: number,
  columnCount: number,
  columnWidth: number = COLUMN_WIDTH,
  overscan = 2,
): Range {
  if (columnCount <= 0 || viewportWidth <= 0) return { first: 0, last: -1 };
  const first = Math.min(
    Math.max(0, Math.floor(scrollLeft / columnWidth) - overscan),
    columnCount - 1,
  );
  const last = Math.min(
    columnCount - 1,
    Math.ceil((scrollLeft + viewportWidth) / columnWidth) + overscan,
  );
  return { first, last };
}
