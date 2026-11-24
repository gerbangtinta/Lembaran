import { describe, expect, it } from 'vitest';
import { findInText, stepHit } from './matches';

describe('find in text', () => {
  it('finds every case-insensitive hit and does not overlap them', () => {
    expect(findInText('banana', 'ana')).toEqual([{ start: 1, end: 4 }]);
    expect(findInText('aaaa', 'aa')).toEqual([
      { start: 0, end: 2 },
      { start: 2, end: 4 },
    ]);
    expect(findInText('Banana BANANA', 'banana')).toEqual([
      { start: 0, end: 6 },
      { start: 7, end: 13 },
    ]);
  });

  it('ignores an empty query instead of matching everywhere', () => {
    expect(findInText('banana', '')).toEqual([]);
    expect(findInText('banana', 'zzz')).toEqual([]);
  });

  it('wraps the current hit around the ends', () => {
    expect(stepHit(0, 3, 1)).toBe(1);
    expect(stepHit(2, 3, 1)).toBe(0);
    expect(stepHit(0, 3, -1)).toBe(2);
    expect(stepHit(-1, 0, 1)).toBe(-1);
  });
});
