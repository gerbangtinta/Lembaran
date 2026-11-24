import { useEffect, useMemo, useRef, useState } from 'react';
import { COLUMN_WIDTH, ROW_HEIGHT, type Range } from './viewport';

export const MIN_COLUMN_WIDTH = 64;
export const MAX_COLUMN_WIDTH = 520;
export const MIN_ROW_HEIGHT = 20;
export const MAX_ROW_HEIGHT = 96;

const STORE_KEY = 'lembaran.csv.sizes';
const WRITE_DELAY = 300;

/**
 * Only what differs from the default is kept: `columns` holds the columns somebody dragged, and
 * `rowHeight` is one height for every row (a sheet is read as a table, not as a pile of boxes).
 */
export interface GridSizes {
  columns: Record<number, number>;
  rowHeight: number;
}

export const DEFAULT_GRID_SIZES: GridSizes = { columns: {}, rowHeight: ROW_HEIGHT };

export function clampColumnWidth(width: number): number {
  if (!Number.isFinite(width)) return COLUMN_WIDTH;
  return Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, Math.round(width)));
}

export function clampRowHeight(height: number): number {
  if (!Number.isFinite(height)) return ROW_HEIGHT;
  return Math.min(MAX_ROW_HEIGHT, Math.max(MIN_ROW_HEIGHT, Math.round(height)));
}

/** `offsets[i]` is where column i starts; `offsets[count]` is the width of the whole row of cells. */
export function columnOffsets(sizes: GridSizes, count: number): number[] {
  const offsets = new Array<number>(count + 1);
  offsets[0] = 0;
  for (let index = 0; index < count; index += 1) {
    offsets[index + 1] = (offsets[index] ?? 0) + (sizes.columns[index] ?? COLUMN_WIDTH);
  }
  return offsets;
}

/** The smallest index whose value is greater than `value`, so `upperBound - 1` is the cell holding it. */
function upperBound(values: readonly number[], value: number): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if ((values[middle] ?? Number.POSITIVE_INFINITY) <= value) low = middle + 1;
    else high = middle;
  }
  return low;
}

/**
 * The columns worth mounting: a binary search over the offsets, because widths vary once somebody has
 * dragged a border and a wide file must stay as cheap to scroll as a narrow one.
 */
export function visibleSlice(
  offsets: readonly number[],
  scrollLeft: number,
  viewportWidth: number,
  overscan = 2,
): Range {
  const count = offsets.length - 1;
  if (count <= 0 || viewportWidth <= 0) return { first: 0, last: -1 };
  const first = Math.max(0, upperBound(offsets, Math.max(0, scrollLeft)) - 1);
  const last = upperBound(offsets, scrollLeft + viewportWidth) - 1;
  return {
    first: Math.max(0, first - overscan),
    last: Math.min(count - 1, last + overscan),
  };
}

function sanitise(value: unknown): GridSizes | null {
  if (typeof value !== 'object' || value === null) return null;
  const source = value as { columns?: unknown; rowHeight?: unknown };
  const columns: Record<number, number> = {};
  if (typeof source.columns === 'object' && source.columns !== null) {
    for (const [key, width] of Object.entries(source.columns)) {
      const index = Number(key);
      const size = Number(width);
      if (Number.isInteger(index) && index >= 0 && Number.isFinite(size)) {
        columns[index] = clampColumnWidth(size);
      }
    }
  }
  return {
    columns,
    rowHeight: clampRowHeight(Number(source.rowHeight ?? ROW_HEIGHT)),
  };
}

function readStore(): Record<string, GridSizes> {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw === null) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: Record<string, GridSizes> = {};
    for (const [key, value] of Object.entries(parsed)) {
      const sizes = sanitise(value);
      if (sizes !== null) result[key] = sizes;
    }
    return result;
  } catch {
    // a disabled or corrupt store is not a reason to fail: the sheet opens at its default width
    return {};
  }
}

function writeStore(key: string, sizes: GridSizes): void {
  try {
    const store = readStore();
    store[key] = sizes;
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // the drag still applies to this session; it just will not survive a reload
  }
}

export interface GridSizeApi {
  sizes: GridSizes;
  resizeColumn(index: number, width: number): void;
  resetColumn(index: number): void;
  setRowHeight(height: number): void;
  resetRowHeight(): void;
}

/**
 * Column widths and the row height for one document, remembered per file so reopening a sheet keeps the
 * shape it was given. Writes are debounced: a drag fires an update per pointer move, not a save per pixel.
 */
export function useGridSizes(docKey: string): GridSizeApi {
  const [sizes, setSizes] = useState<GridSizes>(DEFAULT_GRID_SIZES);
  const pending = useRef<number | undefined>(undefined);

  useEffect(() => {
    setSizes(readStore()[docKey] ?? DEFAULT_GRID_SIZES);
  }, [docKey]);

  useEffect(() => {
    if (pending.current !== undefined) window.clearTimeout(pending.current);
    pending.current = window.setTimeout(() => writeStore(docKey, sizes), WRITE_DELAY);
    return () => {
      if (pending.current !== undefined) window.clearTimeout(pending.current);
    };
  }, [docKey, sizes]);

  return useMemo<GridSizeApi>(
    () => ({
      sizes,
      resizeColumn(index, width) {
        const next = clampColumnWidth(width);
        setSizes((current) =>
          current.columns[index] === next
            ? current
            : { ...current, columns: { ...current.columns, [index]: next } },
        );
      },
      resetColumn(index) {
        setSizes((current) => {
          if (!(index in current.columns)) return current;
          const columns = { ...current.columns };
          delete columns[index];
          return { ...current, columns };
        });
      },
      setRowHeight(height) {
        const next = clampRowHeight(height);
        setSizes((current) => (current.rowHeight === next ? current : { ...current, rowHeight: next }));
      },
      resetRowHeight() {
        setSizes((current) =>
          current.rowHeight === ROW_HEIGHT ? current : { ...current, rowHeight: ROW_HEIGHT },
        );
      },
    }),
    [sizes],
  );
}
