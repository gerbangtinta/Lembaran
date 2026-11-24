import { PDFDocument } from 'pdf-lib';

/**
 * The lossless pass: every page is copied into a fresh document, so objects nothing references anymore
 * (thumbnails of deleted pages, orphaned fonts, an old information dictionary) are simply not written, and
 * object streams pack what is left. Text stays text and vectors stay vectors — nothing is rasterised.
 */
export async function rewriteStructure(bytes: Uint8Array): Promise<Uint8Array> {
  const source = await PDFDocument.load(new Uint8Array(bytes), { updateMetadata: false });
  const dest = await PDFDocument.create();
  const pages = await dest.copyPages(source, source.getPageIndices());
  for (const page of pages) dest.addPage(page);
  return dest.save({ useObjectStreams: true });
}
