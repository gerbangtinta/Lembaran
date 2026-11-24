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

export function pageSizeAt(page: PDFPageProxy, scale: number): PageSize {
  const viewport = page.getViewport({ scale });
  return { width: viewport.width, height: viewport.height };
}

export interface TextPiece {
  text: string;
  left: number;
  top: number;
  fontSize: number;
}

/**
 * Turns a page's text content into absolutely positioned runs. Used for selection
 * and for find-in-document; the canvas still draws the visible glyphs.
 */
export async function textPieces(page: PDFPageProxy, scale: number): Promise<TextPiece[]> {
  const viewport = page.getViewport({ scale });
  const content = await page.getTextContent();
  return content.items.flatMap((item) => {
    if (!('str' in item) || item.str.length === 0) return [];
    const tx = Util.transform(viewport.transform, item.transform);
    const fontSize = Math.hypot(tx[2] ?? 0, tx[3] ?? 0);
    return [{ text: item.str, left: tx[4] ?? 0, top: (tx[5] ?? 0) - fontSize, fontSize }];
  });
}
