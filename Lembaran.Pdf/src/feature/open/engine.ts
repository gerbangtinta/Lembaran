import { Util, getDocument, GlobalWorkerOptions, type PDFDocumentProxy, type PDFPageProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl;

export type { PDFDocumentProxy, PDFPageProxy };

export interface OpenPdfOptions {
  /** Same-origin base that holds `standard_fonts/` and `cmaps/`. Never a CDN. */
  assetBase: string;
}

export interface OpenedPdf {
  doc: PDFDocumentProxy;
  /** Tears down the loading task and its worker. */
  destroy(): Promise<void>;
}

export async function openPdf(bytes: Uint8Array, options: OpenPdfOptions): Promise<OpenedPdf> {
  const task = getDocument({
    data: new Uint8Array(bytes),
    standardFontDataUrl: `${options.assetBase}/standard_fonts/`,
    cMapUrl: `${options.assetBase}/cmaps/`,
    cMapPacked: true,
  });
  const doc = await task.promise;
  return { doc, destroy: () => task.destroy() };
}

export interface PageSize {
  width: number;
  height: number;
}

export function pageSizeAt(page: PDFPageProxy, scale: number, rotation = 0): PageSize {
  const viewport = page.getViewport({ scale, rotation });
  return { width: viewport.width, height: viewport.height };
}

/** A rectangle normalised to the page, the same space placed items are recorded in. */
export interface RunBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TextPiece {
  text: string;
  left: number;
  top: number;
  fontSize: number;
  /** where the run sits on the paper, so a replacement can cover exactly it */
  box: RunBox;
  /** the run's own size in points, for the text a replacement writes */
  points: number;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/**
 * Turns a page's text content into absolutely positioned runs. Used for selection,
 * find-in-document, and for replacing a run; the canvas still draws the visible glyphs.
 *
 * The box is measured against the scale-1 viewport, so it is the run's place on the paper in points — not a
 * pixel count that would change with the zoom. `item.width` is the advance width of the glyphs pdf.js drew.
 */
export async function textPieces(page: PDFPageProxy, scale: number, rotation = 0): Promise<TextPiece[]> {
  const viewport = page.getViewport({ scale, rotation });
  const paper = page.getViewport({ scale: 1, rotation });
  const content = await page.getTextContent();
  return content.items.flatMap((item) => {
    if (!('str' in item) || item.str.length === 0) return [];
    const tx = Util.transform(viewport.transform, item.transform);
    const fontSize = Math.hypot(tx[2] ?? 0, tx[3] ?? 0);
    const at = Util.transform(paper.transform, item.transform);
    const points = Math.hypot(at[2] ?? 0, at[3] ?? 0) || 1;
    const left = at[4] ?? 0;
    const baseline = at[5] ?? 0;
    const width = Math.max(0, item.width);
    // the transform's axes already carry the font size (`points`), so the unit directions are the axes divided
    // by it: advance along the baseline by `item.width` points, then across it by a line's height. The page's
    // quarter turn is inside the transform, so a run on a rotated page is covered just as well.
    const unitX = { x: (at[0] ?? 0) / points, y: (at[1] ?? 0) / points };
    const unitY = { x: (at[2] ?? 0) / points, y: (at[3] ?? 0) / points };
    const advance = { x: unitX.x * width, y: unitX.y * width };
    // a line of text reaches about 0.9 em above the baseline and 0.25 em below it: enough to hide the
    // old glyphs, descenders included, without swallowing the line above
    const up = { x: unitY.x * points * 0.9, y: unitY.y * points * 0.9 };
    const down = { x: unitY.x * -points * 0.25, y: unitY.y * -points * 0.25 };
    const xs = [left + up.x, left + advance.x + up.x, left + down.x, left + advance.x + down.x];
    const ys = [baseline + up.y, baseline + advance.y + up.y, baseline + down.y, baseline + advance.y + down.y];
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const box: RunBox = {
      x: clamp01(minX / paper.width),
      y: clamp01(minY / paper.height),
      w: clamp01((Math.max(...xs) - minX) / paper.width),
      h: clamp01((Math.max(...ys) - minY) / paper.height),
    };
    return [{ text: item.str, left: tx[4] ?? 0, top: (tx[5] ?? 0) - fontSize, fontSize, box, points }];
  });
}
