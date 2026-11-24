export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2;
export const ZOOM_STEP = 0.1;
/** room left around a cell that find jumps to */
export const REVEAL_MARGIN = 56;

export function clampZoom(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value)) * 100) / 100;
}

export function stepZoom(current: number, direction: 1 | -1): number {
  return clampZoom(current + direction * ZOOM_STEP);
}

export function zoomLabel(zoom: number): string {
  return `${Math.round(zoom * 100)}%`;
}

/** A1 column letters for a zero-based column index: 0 → A, 25 → Z, 26 → AA. */
export function columnName(index: number): string {
  if (!Number.isFinite(index) || index < 0) return '';
  let rest = Math.floor(index);
  let name = '';
  while (rest >= 0) {
    name = String.fromCharCode(65 + (rest % 26)) + name;
    rest = Math.floor(rest / 26) - 1;
  }
  return name;
}

export function cellAddress(row: number, col: number): string {
  return `${columnName(col)}${Math.max(0, row) + 1}`;
}

export interface ScrollPoint {
  x: number;
  y: number;
}

/** Content pixels cannot scroll past the sheet's extent or below zero. */
export function clampScroll(
  point: ScrollPoint,
  contentWidth: number,
  contentHeight: number,
  viewWidth: number,
  viewHeight: number,
): ScrollPoint {
  const maxX = Math.max(0, contentWidth - viewWidth);
  const maxY = Math.max(0, contentHeight - viewHeight);
  return {
    x: Math.min(maxX, Math.max(0, Number.isFinite(point.x) ? point.x : 0)),
    y: Math.min(maxY, Math.max(0, Number.isFinite(point.y) ? point.y : 0)),
  };
}

/** Where to scroll so a cell sits inside the viewport with a little room above/left. */
export function revealScroll(
  cell: ScrollPoint,
  contentWidth: number,
  contentHeight: number,
  viewWidth: number,
  viewHeight: number,
): ScrollPoint {
  return clampScroll(
    { x: cell.x - REVEAL_MARGIN, y: cell.y - REVEAL_MARGIN },
    contentWidth,
    contentHeight,
    viewWidth,
    viewHeight,
  );
}

/** Scroll only as far as needed to keep a cell inside the viewport; visible cells do not move. */
export function ensureVisible(
  cell: ScrollPoint,
  cellWidth: number,
  cellHeight: number,
  scroll: ScrollPoint,
  viewWidth: number,
  viewHeight: number,
  contentWidth: number,
  contentHeight: number,
): ScrollPoint {
  let { x, y } = scroll;
  if (cell.x < x) x = cell.x;
  else if (cell.x + cellWidth > x + viewWidth) x = cell.x + cellWidth - viewWidth;
  if (cell.y < y) y = cell.y;
  else if (cell.y + cellHeight > y + viewHeight) y = cell.y + cellHeight - viewHeight;
  return clampScroll({ x, y }, contentWidth, contentHeight, viewWidth, viewHeight);
}

/** Next visible sheet in `delta` direction; hidden sheets are stepped over, and the ends hold. */
export function stepSheet(sheets: readonly { hidden: boolean }[], index: number, delta: number): number {
  if (sheets.length === 0) return 0;
  const step = delta >= 0 ? 1 : -1;
  let next = index;
  for (let attempts = 0; attempts < sheets.length; attempts += 1) {
    next += step;
    if (next < 0 || next >= sheets.length) return index;
    if (!sheets[next]?.hidden) return next;
  }
  return index;
}

/** `2 of 5` — the read-out for a find hit. Zero hits says so plainly. */
export function hitLabel(index: number, total: number): string {
  if (total <= 0) return 'No matches';
  return `${index + 1} of ${total}`;
}
