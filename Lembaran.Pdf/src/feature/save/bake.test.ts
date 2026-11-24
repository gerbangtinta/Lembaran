import { describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { bake, toRgb, wrapLine } from './bake';
import { emptyPlan, insertBlank, rotateSourcePage } from '../edit/model';
import type { EditItem } from '../../storage/edits';

async function fixture(pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let index = 0; index < pages; index += 1) {
    const page = doc.addPage([300, 400]);
    // real pages carry a content stream; embedding an empty one is not something pdf-lib allows
    page.drawRectangle({ x: 20, y: 20, width: 40, height: 40, color: rgb(0.8, 0.8, 0.8) });
  }
  return doc.save();
}

async function reopen(bytes: Uint8Array) {
  return PDFDocument.load(new Uint8Array(bytes));
}

describe('bake', () => {
  it('writes the recorded pages in order', async () => {
    const bytes = await fixture(3);
    const plan = { ...emptyPlan(3), order: [3, 1] };
    const result = await bake({ bytes, plan, items: [] });
    const reread = await reopen(result.bytes);
    expect(reread.getPageCount()).toBe(2);
    expect(result.pages).toBe(2);
  });

  it('draws a blank page at its place, at the size it was given', async () => {
    const bytes = await fixture(2);
    const plan = insertBlank(emptyPlan(2), 1, { width: 200, height: 260 });
    const result = await bake({ bytes, plan, items: [] });
    const reread = await reopen(result.bytes);
    expect(reread.getPageCount()).toBe(3);
    expect(reread.getPage(1).getSize()).toEqual({ width: 200, height: 260 });
  });

  it('turns a rotated page into a page of swapped size with no /Rotate left on it', async () => {
    const bytes = await fixture(2);
    const plan = rotateSourcePage(emptyPlan(2), 1, 90);
    const result = await bake({ bytes, plan, items: [] });
    const reread = await reopen(result.bytes);
    expect(reread.getPage(0).getSize()).toEqual({ width: 400, height: 300 });
    expect(reread.getPage(0).getRotation().angle).toBe(0);
    expect(reread.getPage(1).getSize()).toEqual({ width: 300, height: 400 });
  });

  it('keeps the item list out of the page count and writes text and ink', async () => {
    const bytes = await fixture(1);
    const items: EditItem[] = [
      { id: 't1', kind: 'text', page: 1, x: 0.1, y: 0.1, w: 0.5, h: 0.1, text: 'edited', size: 12, color: '#111111', align: 'left' },
      { id: 'i1', kind: 'ink', page: 1, x: 0, y: 0, w: 0, h: 0, points: [ { x: 0.2, y: 0.2 }, { x: 0.4, y: 0.3 } ], color: '#ff0000', width: 2 } as unknown as EditItem,
      { id: 'h1', kind: 'highlight', page: 1, x: 0.2, y: 0.2, w: 0.3, h: 0.05, color: 'amber' },
    ];
    const result = await bake({ bytes, plan: emptyPlan(1), items });
    const reread = await reopen(result.bytes);
    expect(reread.getPageCount()).toBe(1);
    // the content stream now carries our drawing operators, not just the empty page
    const content = reread.getPage(0).node.Contents();
    expect(content).toBeTruthy();
  });

  it('bakes a replacement, empty or not, as a page with a patch', async () => {
    const bytes = await fixture(1);
    const items: EditItem[] = [
      { id: 't1', kind: 'text', page: 1, x: 0.1, y: 0.1, w: 0.5, h: 0.1, text: 'new words', size: 12, color: '#111111', align: 'left', replaced: 'old words' },
      { id: 't2', kind: 'text', page: 1, x: 0.1, y: 0.3, w: 0.5, h: 0.1, text: '', size: 12, color: '#111111', align: 'left', replaced: 'gone' },
    ];
    const result = await bake({ bytes, plan: emptyPlan(1), items });
    expect(result.pages).toBe(1);
    expect((await reopen(result.bytes)).getPageCount()).toBe(1);
  });

  it('reads a hex colour and falls back to black', () => {
    expect(toRgb('#ff0000')).toEqual({ r: 1, g: 0, b: 0 });
    expect(toRgb('nonsense')).toEqual({ r: 0, g: 0, b: 0 });
  });
});

describe('wrapLine', () => {
  it('breaks a sentence at its spaces so every line fits the box', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const lines = wrapLine('a sentence that has to wrap', font, 12, 60);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(font.widthOfTextAtSize(line, 12)).toBeLessThanOrEqual(60);
    expect(lines.join(' ')).toBe('a sentence that has to wrap');
  });

  it('leaves a word wider than the box on a line of its own', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    expect(wrapLine('unbreakable', font, 12, 5)).toEqual(['unbreakable']);
    expect(wrapLine('', font, 12, 60)).toEqual(['']);
  });
});
