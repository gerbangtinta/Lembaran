import { describe, expect, it } from 'vitest';
import { columnName, visibleColumns, visibleRange } from './viewport';

describe('grid viewport', () => {
  it('renders only what is on screen, plus overscan', () => {
    expect(visibleRange(0, 260, 1000)).toEqual({ first: 0, last: 16 });
    expect(visibleRange(2600, 260, 1000)).toEqual({ first: 94, last: 116 });
  });

  it('never runs past the last row', () => {
    expect(visibleRange(0, 260, 5)).toEqual({ first: 0, last: 4 });
    expect(visibleRange(9999, 260, 5)).toEqual({ first: 4, last: 4 });
    expect(visibleRange(0, 0, 5)).toEqual({ first: 0, last: -1 });
  });

  it('labels columns like a spreadsheet', () => {
    expect(columnName(0)).toBe('A');
    expect(columnName(25)).toBe('Z');
    expect(columnName(26)).toBe('AA');
    expect(columnName(701)).toBe('ZZ');
    expect(columnName(702)).toBe('AAA');
  });

  it('narrows columns the same way as rows', () => {
    expect(visibleColumns(0, 300, 50)).toEqual({ first: 0, last: 5 });
    expect(visibleColumns(1480, 300, 50)).toEqual({ first: 8, last: 15 });
    expect(visibleColumns(0, 300, 2)).toEqual({ first: 0, last: 1 });
  });
});
