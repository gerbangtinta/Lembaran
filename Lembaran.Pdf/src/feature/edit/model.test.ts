import { describe, expect, it } from 'vitest';
import {
  A4,
  clampDisplay,
  deleteSourcePage,
  displayBox,
  displayPages,
  displayToSource,
  emptyPlan,
  insertBlank,
  removeBlank,
  rotateBy,
  rotateSourcePage,
  sourceToDisplay,
} from './model';

describe('page plan', () => {
  it('draws every page of an untouched document', () => {
    expect(displayPages(emptyPlan(3), 3).map((page) => page.source)).toEqual([1, 2, 3]);
  });

  it('drops a deleted page and keeps the reading order', () => {
    const plan = deleteSourcePage(emptyPlan(4), 2);
    expect(plan.order).toEqual([1, 3, 4]);
    expect(displayPages(plan, 4).map((page) => page.source)).toEqual([1, 3, 4]);
    expect(sourceToDisplay(displayPages(plan, 4), 3)).toBe(1);
    expect(sourceToDisplay(displayPages(plan, 4), 2)).toBe(-1);
  });

  it('never deletes the last page', () => {
    const one = emptyPlan(1);
    expect(deleteSourcePage(one, 1)).toBe(one);
  });

  it('puts a blank page where it was asked for, and keeps it there when a page before it goes', () => {
    const withBlank = insertBlank(emptyPlan(3), 1, A4);
    expect(displayPages(withBlank, 3).map((page) => page.source)).toEqual([1, null, 2, 3]);
    expect(displayPages(withBlank, 3)[1]?.width).toBe(A4.width);

    const afterDelete = deleteSourcePage(withBlank, 2);
    expect(displayPages(afterDelete, 3).map((page) => page.source)).toEqual([1, null, 3]);
  });

  it('takes an invented page back out, keeping the paper and the source pages', () => {
    const withBlank = insertBlank(emptyPlan(2), 1, A4);
    const blank = displayPages(withBlank, 2)[1];
    expect(blank?.blankId).toBeDefined();
    const plan = removeBlank(withBlank, blank?.blankId ?? '');
    expect(displayPages(plan, 2).map((page) => page.source)).toEqual([1, 2]);
    expect(removeBlank(plan, 'missing')).toBe(plan);
  });

  it('adds a blank at the end', () => {
    const plan = insertBlank(emptyPlan(2), 2, A4);
    expect(displayPages(plan, 2).map((page) => page.source)).toEqual([1, 2, null]);
  });

  it('rotates in quarter turns and wraps around', () => {
    expect(rotateBy(0, 90)).toBe(90);
    expect(rotateBy(90, 90)).toBe(180);
    expect(rotateBy(270, 90)).toBe(0);
    expect(rotateBy(0, -90)).toBe(270);
    const plan = rotateSourcePage(rotateSourcePage(emptyPlan(2), 1, 90), 1, 90);
    expect(displayPages(plan, 2)[0]?.rotation).toBe(180);
    expect(plan.rotation[2]).toBeUndefined();
  });

  it('falls back to the whole document when the record no longer fits it', () => {
    const stale = { order: [9, 10], rotation: {}, blanks: [] };
    expect(displayPages(stale, 3).map((page) => page.source)).toEqual([1, 2, 3]);
    expect(displayPages({ order: [], rotation: {}, blanks: [] }, 2)).toHaveLength(2);
  });

  it('draws a turned page on swapped paper instead of squeezing it into the unrotated box', () => {
    const [first] = displayPages(rotateSourcePage(emptyPlan(1), 1, 90), 1);
    expect(first).toBeDefined();
    expect(displayBox(first!, { width: 420, height: 595 })).toEqual({ width: 595, height: 420 });
  });

  it('gives a blank the size the record asked for, not the source paper', () => {
    const blank = displayPages(insertBlank(emptyPlan(1), 1, { width: 842, height: 595 }), 1)[1];
    expect(blank).toBeDefined();
    expect(displayBox(blank!, { width: 420, height: 595 })).toEqual({ width: 842, height: 595 });
  });

  it('says the paper is unknown until a source page has been measured', () => {
    const [first] = displayPages(emptyPlan(1), 1);
    expect(first).toBeDefined();
    expect(displayBox(first!, undefined)).toBeNull();
  });

  it('maps display positions and clamps them to what exists', () => {
    const pages = displayPages(insertBlank(emptyPlan(2), 0, A4), 2); // blank, 1, 2
    expect(displayToSource(pages, 0)).toBeNull();
    expect(displayToSource(pages, 2)).toBe(2);
    expect(clampDisplay(pages, 99)).toBe(3);
    expect(clampDisplay(pages, 0)).toBe(1);
    expect(clampDisplay([], 4)).toBe(1);
  });
});
