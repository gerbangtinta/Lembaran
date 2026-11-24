import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GRID_SIZES,
  MAX_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
  clampColumnWidth,
  clampRowHeight,
  columnOffsets,
  visibleSlice,
} from './sizes';
import { COLUMN_WIDTH, ROW_HEIGHT } from './viewport';

describe('grid sizes', () => {
  it('keeps a drag inside sensible bounds', () => {
    expect(clampColumnWidth(10)).toBe(MIN_COLUMN_WIDTH);
    expect(clampColumnWidth(9000)).toBe(MAX_COLUMN_WIDTH);
    expect(clampColumnWidth(Number.NaN)).toBe(COLUMN_WIDTH);
    expect(clampRowHeight(1)).toBe(20);
    expect(clampRowHeight(400)).toBe(96);
    expect(clampRowHeight(Number.NaN)).toBe(ROW_HEIGHT);
  });

  it('places columns at the widths they were given, and falls back to the default', () => {
    const offsets = columnOffsets({ columns: { 1: 200 }, rowHeight: ROW_HEIGHT }, 4);
    expect(offsets).toEqual([0, COLUMN_WIDTH, COLUMN_WIDTH + 200, COLUMN_WIDTH + 200 + COLUMN_WIDTH, COLUMN_WIDTH * 3 + 200]);
    expect(columnOffsets(DEFAULT_GRID_SIZES, 0)).toEqual([0]);
  });

  it('finds the visible columns across uneven widths', () => {
    const sizes = { columns: { 0: 400, 2: 80 }, rowHeight: ROW_HEIGHT };
    const offsets = columnOffsets(sizes, 20);
    // 400 | 148 | 80 | 148 …
    expect(visibleSlice(offsets, 0, 300, 0)).toEqual({ first: 0, last: 0 });
    expect(visibleSlice(offsets, 380, 300, 0)).toEqual({ first: 0, last: 3 });
    expect(visibleSlice(offsets, 628, 300, 0)).toEqual({ first: 3, last: 5 });
    expect(visibleSlice(offsets, 0, 0, 0)).toEqual({ first: 0, last: -1 });
  });

  it('never runs past the last column', () => {
    const offsets = columnOffsets(DEFAULT_GRID_SIZES, 3);
    expect(visibleSlice(offsets, 0, 5000, 2)).toEqual({ first: 0, last: 2 });
  });
});
