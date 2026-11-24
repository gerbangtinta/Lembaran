import { describe, expect, it } from 'vitest';
import {
  defaultStampDesign,
  moveStampLine,
  moveStampLineTo,
  newStampLine,
  simpleStampDesign,
  stampLabel,
  stampLayout,
} from './design';
import type { StampDesign } from '../../storage/edits';

/** a stand-in for canvas text measurement: wide characters count, which is all the layout needs to know */
const measure = (text: string, size: number): number => text.length * size * 0.5;

describe('stamp layout', () => {
  it('sizes the sheet around the lines that were filled in', () => {
    const design: StampDesign = {
      style: 'paper',
      colour: '#b03a2e',
      size: 'md',
      uppercase: true,
      border: 'double',
      align: 'center',
      lines: [newStampLine('APPROVED', true, 'lg'), newStampLine(''), newStampLine('Ahmad'), newStampLine('   ')],
    };
    const layout = stampLayout(design, measure);
    expect(layout.lines.map((line) => line.text)).toEqual(['APPROVED', 'AHMAD']);
    expect(layout.lines[0]?.bold).toBe(true);

    const widest = Math.max(
      measure('APPROVED', layout.lines[0]?.size ?? 0),
      measure('AHMAD', layout.lines[1]?.size ?? 0),
    );
    expect(layout.width).toBe(Math.ceil(widest + (layout.padding + layout.frame) * 2));
    const inner = layout.lineHeights.reduce((sum, height) => sum + height, 0);
    expect(layout.height).toBe(Math.ceil(inner + (layout.padding + layout.frame) * 2));
  });

  it('splits a multiline entry into its own lines', () => {
    const design = { ...defaultStampDesign(), lines: [newStampLine('12 Main Street\nKuala Lumpur')] };
    expect(stampLayout(design, measure).lines.map((line) => line.text)).toEqual([
      '12 MAIN STREET',
      'KUALA LUMPUR',
    ]);
  });

  it('keeps the case when capitals are off', () => {
    const design = { ...defaultStampDesign(), uppercase: false, lines: [newStampLine('Signed off')] };
    expect(stampLayout(design, measure).lines[0]?.text).toBe('Signed off');
  });

  it('gives a plain stamp no frame and less padding than a paper one', () => {
    const paper = stampLayout({ ...defaultStampDesign(), lines: [newStampLine('X')] }, measure);
    const plain = stampLayout(
      { ...defaultStampDesign(), style: 'plain', lines: [newStampLine('X')] },
      measure,
    );
    expect(plain.frame).toBe(0);
    expect(plain.padding).toBeLessThan(paper.padding);
  });

  it('labels a stamp by its first filled line, and says Stamp when there is none', () => {
    expect(stampLabel({ ...defaultStampDesign(), lines: [newStampLine(''), newStampLine('PAID')] })).toBe('PAID');
    expect(stampLabel({ ...defaultStampDesign(), lines: [newStampLine('')] })).toBe('Stamp');
  });

  it('drops a stock stamp to its one line', () => {
    expect(stampLayout(simpleStampDesign('approved'), measure).lines.map((line) => line.text)).toEqual(['APPROVED']);
  });
});

describe('stamp rows', () => {
  const rows = () => [newStampLine('ONE'), newStampLine('TWO'), newStampLine('THREE')];
  const texts = (lines: ReturnType<typeof rows>) => lines.map((line) => line.text);

  it('moves a row up and down around its neighbours', () => {
    const lines = rows();
    expect(texts(moveStampLine(lines, lines[2]?.id ?? '', -1))).toEqual(['ONE', 'THREE', 'TWO']);
    expect(texts(moveStampLine(lines, lines[0]?.id ?? '', 1))).toEqual(['TWO', 'ONE', 'THREE']);
  });

  it('leaves the order alone when a row is already at the end', () => {
    const lines = rows();
    expect(texts(moveStampLine(lines, lines[0]?.id ?? '', -1))).toEqual(['ONE', 'TWO', 'THREE']);
    expect(texts(moveStampLine(lines, lines[2]?.id ?? '', 1))).toEqual(['ONE', 'TWO', 'THREE']);
    expect(texts(moveStampLine(lines, 'missing', 1))).toEqual(['ONE', 'TWO', 'THREE']);
  });

  it('reorders the rows the stamp is laid out from', () => {
    const design = { ...defaultStampDesign(), lines: rows() };
    const moved = { ...design, lines: moveStampLine(design.lines, design.lines[0]?.id ?? '', 2) };
    expect(stampLayout(moved, measure).lines.map((line) => line.text)).toEqual(['TWO', 'THREE', 'ONE']);
  });

  it('drops a dragged row where the row it was dropped on sits', () => {
    const lines = rows();
    expect(texts(moveStampLineTo(lines, lines[0]?.id ?? '', lines[2]?.id ?? ''))).toEqual(['TWO', 'THREE', 'ONE']);
    expect(texts(moveStampLineTo(lines, lines[2]?.id ?? '', lines[0]?.id ?? ''))).toEqual(['THREE', 'ONE', 'TWO']);
    // dropped back on itself, or on nothing: the order is untouched
    expect(texts(moveStampLineTo(lines, lines[1]?.id ?? '', lines[1]?.id ?? ''))).toEqual(['ONE', 'TWO', 'THREE']);
    expect(texts(moveStampLineTo(lines, 'missing', lines[1]?.id ?? ''))).toEqual(['ONE', 'TWO', 'THREE']);
  });
});
