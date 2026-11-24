import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import type { EditItem, ImageItem, InkItem, PagePlan, TextItem } from '../../storage/edits';

/** WinAnsi is what a standard font can write: anything else would come out as a blank box. */
function latin1(text: string): string {
  return text.replace(/[^\u0000-\u00ff]/g, '?');
}

/** `#rrggbb` to a pdf-lib colour; anything unreadable is black. */
export function toRgb(color: string): { r: number; g: number; b: number } {
  const hex = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!hex) return { r: 0, g: 0, b: 0 };
  const value = Number.parseInt(hex[1] ?? '000000', 16);
  return { r: ((value >> 16) & 255) / 255, g: ((value >> 8) & 255) / 255, b: (value & 255) / 255 };
}

const HIGHLIGHTS: Record<string, { r: number; g: number; b: number }> = {
  amber: { r: 1, g: 0.78, b: 0.2 },
  green: { r: 0.45, g: 0.82, b: 0.5 },
  blue: { r: 0.4, g: 0.68, b: 0.95 },
  rose: { r: 0.95, g: 0.5, b: 0.62 },
};

export interface BakeInput {
  bytes: Uint8Array;
  plan: PagePlan;
  items: readonly EditItem[];
  /** image bytes by blob id, read from the edit store before baking */
  images?: ReadonlyMap<string, { bytes: Uint8Array; mime: string }>;
}

export interface BakeResult {
  bytes: Uint8Array;
  pages: number;
}

interface Box {
  width: number;
  height: number;
}

/**
 * Turns the edit record into a real PDF: pages in the recorded order, a blank drawn where one was asked for,
 * a rotation baked as a turned copy of the page, then every item replanted in display coordinates.
 *
 * A rotated page is built as a new page of the swapped size with the old one drawn into it, so `/Rotate` stays
 * 0 and an item's normalised box means the same thing on every page we write.
 */
export async function bake(input: BakeInput): Promise<BakeResult> {
  const source = await PDFDocument.load(new Uint8Array(input.bytes), { updateMetadata: false });
  const dest = await PDFDocument.create();
  const font = await dest.embedFont(StandardFonts.Helvetica);
  const embeddedImages = new Map<string, PDFImage>();

  const embedImage = async (item: ImageItem): Promise<PDFImage | null> => {
    const cached = embeddedImages.get(item.blobId);
    if (cached) return cached;
    const stored = input.images?.get(item.blobId);
    if (!stored) return null;
    const embedded =
      stored.mime === 'image/png' ? await dest.embedPng(stored.bytes) : await dest.embedJpg(stored.bytes);
    embeddedImages.set(item.blobId, embedded);
    return embedded;
  };

  const byPage = new Map<number, EditItem[]>();
  for (const item of input.items) {
    const list = byPage.get(item.page);
    if (list) list.push(item);
    else byPage.set(item.page, [item]);
  }

  interface Entry {
    source: number | null;
    rotation: number;
    size?: Box;
  }

  const sequence: Entry[] = [];
  for (const pageNumber of input.plan.order) {
    if (pageNumber < 1 || pageNumber > source.getPageCount()) continue;
    sequence.push({ source: pageNumber, rotation: input.plan.rotation[pageNumber] ?? 0 });
  }
  for (const blank of [...input.plan.blanks].sort((left, right) => left.at - right.at)) {
    const at = Math.min(sequence.length, Math.max(0, blank.at));
    sequence.splice(at, 0, { source: null, rotation: 0, size: { width: blank.width, height: blank.height } });
  }

  for (const entry of sequence) {
    if (entry.source === null) {
      dest.addPage([entry.size?.width ?? 595.28, entry.size?.height ?? 841.89]);
      continue;
    }

    const original = source.getPage(entry.source - 1);
    const box = original.getSize();
    let target: PDFPage;

    if (entry.rotation === 0) {
      const [copied] = await dest.copyPages(source, [entry.source - 1]);
      target = dest.addPage(copied);
    } else {
      const turned = entry.rotation === 90 || entry.rotation === 270;
      const size: [number, number] = turned ? [box.height, box.width] : [box.width, box.height];
      target = dest.addPage(size);
      // a page with no content stream cannot be embedded; the turned page is then simply empty
      const embedded = original.node.Contents() ? await dest.embedPage(original) : null;
      if (!embedded) continue;
      if (entry.rotation === 90) {
        target.drawPage(embedded, { x: 0, y: box.height, width: box.width, height: box.height, rotate: degrees(-90) });
      } else if (entry.rotation === 180) {
        target.drawPage(embedded, { x: box.width, y: box.height, width: box.width, height: box.height, rotate: degrees(180) });
      } else {
        target.drawPage(embedded, { x: box.width, y: 0, width: box.width, height: box.height, rotate: degrees(90) });
      }
    }

    const list = byPage.get(entry.source) ?? [];
    if (list.length === 0) continue;
    const { width, height } = target.getSize();
    for (const item of list) {
      if (item.kind === 'highlight') {
        const color = HIGHLIGHTS[item.color] ?? HIGHLIGHTS.amber ?? { r: 1, g: 0.78, b: 0.2 };
        target.drawRectangle({
          x: item.x * width,
          y: height - (item.y + item.h) * height,
          width: item.w * width,
          height: item.h * height,
          color: rgb(color.r, color.g, color.b),
          opacity: 0.35,
        });
      } else if (item.kind === 'ink') {
        drawInk(target, item, width, height);
      } else if (item.kind === 'image') {
        const embedded = await embedImage(item);
        if (!embedded) continue;
        target.drawImage(embedded, {
          x: item.x * width,
          y: height - (item.y + item.h) * height,
          width: item.w * width,
          height: item.h * height,
        });
      } else if (item.kind === 'text') {
        drawText(target, item, width, height, font);
      }
    }
  }

  const bytes = await dest.save({ useObjectStreams: true });
  return { bytes, pages: dest.getPageCount() };
}

function drawInk(page: PDFPage, item: InkItem, width: number, height: number): void {
  const color = toRgb(item.color);
  const stroke = rgb(color.r, color.g, color.b);
  for (let index = 1; index < item.points.length; index += 1) {
    const from = item.points[index - 1];
    const to = item.points[index];
    if (!from || !to) continue;
    page.drawLine({
      start: { x: from.x * width, y: height - from.y * height },
      end: { x: to.x * width, y: height - to.y * height },
      thickness: item.width,
      color: stroke,
    });
  }
}

/** Breaks one paragraph at its spaces so every line fits the box; a single word longer than the box stands alone. */
export function wrapLine(line: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (maxWidth <= 0 || line.length === 0) return [line];
  const words = line.split(/(\s+)/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current + word;
    if (current.length === 0 || font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    lines.push(current.trimEnd());
    current = word.trimStart();
  }
  lines.push(current.trimEnd());
  return lines;
}

function drawText(page: PDFPage, item: TextItem, width: number, height: number, font: PDFFont): void {
  // a replacement owns the run it covers, and a box can ask for a patch of its own: the white first, then the
  // words, so an empty replacement simply erases the run
  if (item.replaced !== undefined || item.background === 'white') {
    page.drawRectangle({
      x: item.x * width,
      y: height - (item.y + item.h) * height,
      width: item.w * width,
      height: item.h * height,
      color: rgb(1, 1, 1),
    });
  }
  if (item.text.trim().length === 0) return;
  const color = toRgb(item.color);
  const boxWidth = item.w * width;
  // the reader wraps inside the box, so the file must wrap the same way: a line is broken at spaces until it fits
  const lines = latin1(item.text)
    .split('\n')
    .flatMap((line) => wrapLine(line, font, item.size, boxWidth));
  const lineHeight = item.size * 1.25;
  const top = height - item.y * height;
  lines.forEach((line, index) => {
    const textWidth = font.widthOfTextAtSize(line, item.size);
    const offset =
      item.align === 'center' ? (boxWidth - textWidth) / 2 : item.align === 'right' ? boxWidth - textWidth : 0;
    page.drawText(line, {
      x: item.x * width + offset,
      y: top - item.size - index * lineHeight,
      size: item.size,
      font,
      color: rgb(color.r, color.g, color.b),
    });
  });
}
