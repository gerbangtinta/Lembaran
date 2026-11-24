import { describe, expect, it } from 'vitest';
import {
  cellAddress,
  clampScroll,
  clampZoom,
  columnName,
  ensureVisible,
  hitLabel,
  revealScroll,
  stepSheet,
  stepZoom,
} from './view';

describe('zoom', () => {
  it('clamps and steps inside the range', () => {
    expect(clampZoom(0.1)).toBe(0.5);
    expect(clampZoom(9)).toBe(2);
    expect(clampZoom(Number.NaN)).toBe(1);
    expect(stepZoom(1, 1)).toBe(1.1);
    expect(stepZoom(0.5, -1)).toBe(0.5);
  });
});

describe('cell addresses', () => {
  it('spells columns past Z', () => {
    expect(columnName(0)).toBe('A');
    expect(columnName(25)).toBe('Z');
    expect(columnName(26)).toBe('AA');
    expect(columnName(701)).toBe('ZZ');
    expect(columnName(702)).toBe('AAA');
    expect(cellAddress(0, 0)).toBe('A1');
    expect(cellAddress(9, 2)).toBe('C10');
  });
});

describe('scroll', () => {
  it('never goes negative and never past the content', () => {
    expect(clampScroll({ x: -10, y: -1 }, 1000, 800, 400, 300)).toEqual({ x: 0, y: 0 });
    expect(clampScroll({ x: 900, y: 900 }, 1000, 800, 400, 300)).toEqual({ x: 600, y: 500 });
    expect(clampScroll({ x: 10, y: 20 }, 1000, 800, 400, 300)).toEqual({ x: 10, y: 20 });
  });

  it('reveals a cell with a margin, clamped', () => {
    expect(revealScroll({ x: 200, y: 100 }, 2000, 2000, 400, 300)).toEqual({ x: 144, y: 44 });
    expect(revealScroll({ x: 10, y: 10 }, 2000, 2000, 400, 300)).toEqual({ x: 0, y: 0 });
  });

  it('moves only when the cell leaves the viewport', () => {
    expect(ensureVisible({ x: 120, y: 60 }, 80, 24, { x: 100, y: 50 }, 400, 300, 2000, 2000)).toEqual({
      x: 100,
      y: 50,
    });
    expect(ensureVisible({ x: 520, y: 380 }, 80, 24, { x: 100, y: 50 }, 400, 300, 2000, 2000)).toEqual({
      x: 200,
      y: 104,
    });
    expect(ensureVisible({ x: 0, y: 0 }, 80, 24, { x: 100, y: 50 }, 400, 300, 2000, 2000)).toEqual({
      x: 0,
      y: 0,
    });
  });
});

describe('sheet stepping', () => {
  const sheets = [{ hidden: false }, { hidden: true }, { hidden: false }, { hidden: false }];

  it('skips hidden sheets and holds at the ends', () => {
    expect(stepSheet(sheets, 0, 1)).toBe(2);
    expect(stepSheet(sheets, 2, -1)).toBe(0);
    expect(stepSheet(sheets, 3, 1)).toBe(3);
    expect(stepSheet(sheets, 0, -1)).toBe(0);
    expect(stepSheet([{ hidden: true }], 0, 1)).toBe(0);
  });
});

describe('find label', () => {
  it('counts from one and says when there is nothing', () => {
    expect(hitLabel(0, 3)).toBe('1 of 3');
    expect(hitLabel(2, 3)).toBe('3 of 3');
    expect(hitLabel(-1, 0)).toBe('No matches');
  });
});
