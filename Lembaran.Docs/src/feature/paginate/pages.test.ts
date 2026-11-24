import { describe, expect, it } from 'vitest';
import { currentPage, pageLabel } from './pages';

describe('pagination', () => {
  const tops = [0, 900, 1800, 2700];

  it('reports the page that crosses the top of the viewport', () => {
    expect(currentPage(tops, 0)).toBe(0);
    expect(currentPage(tops, 899)).toBe(0);
    expect(currentPage(tops, 905)).toBe(1);
    expect(currentPage(tops, 5000)).toBe(3);
  });

  it('survives an empty document', () => {
    expect(currentPage([], 0)).toBe(0);
    expect(pageLabel(0, 0)).toBe('0 / 0');
    expect(pageLabel(2, 5)).toBe('3 / 5');
  });
});
