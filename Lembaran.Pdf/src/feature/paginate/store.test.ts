import { describe, expect, it } from 'vitest';
import { offsetForPage, pageAtOffset } from './store';

const offsets = [0, 800, 1600, 2400];

describe('paginate', () => {
  it('reports the page whose top has been passed', () => {
    expect(pageAtOffset(offsets, 0)).toBe(1);
    expect(pageAtOffset(offsets, 790)).toBe(1);
    expect(pageAtOffset(offsets, 800)).toBe(2);
    expect(pageAtOffset(offsets, 2500)).toBe(4);
  });

  it('never reports a page outside the document', () => {
    expect(pageAtOffset([], 5000)).toBe(1);
    expect(pageAtOffset(offsets, 10_000)).toBe(4);
  });

  it('scrolls to a page with a margin, clamped at the start', () => {
    expect(offsetForPage(offsets, 2)).toBe(788);
    expect(offsetForPage(offsets, 1)).toBe(0);
    expect(offsetForPage(offsets, 99)).toBe(2388);
  });
});
