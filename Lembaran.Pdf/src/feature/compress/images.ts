import { PDFDict, PDFDocument, PDFName, PDFNumber, PDFRawStream, PDFRef, PDFStream } from 'pdf-lib';

export interface ImageReport {
  recompressed: number;
  skipped: number;
}

const MAX_EDGE = 1600;

/**
 * Re-encodes the page images, and only the images: every glyph and every vector path in the document stays
 * exactly where it was. A JPEG inside a PDF is already a JPEG, so it is decoded, shrunk past `maxEdge` and
 * written back at a lower quality; anything we cannot re-encode safely is left untouched and counted.
 */
export async function compressImages(
  bytes: Uint8Array,
  quality: number,
  maxEdge = MAX_EDGE,
): Promise<{ bytes: Uint8Array; images: ImageReport }> {
  const doc = await PDFDocument.load(new Uint8Array(bytes), { updateMetadata: false });
  const report: ImageReport = { recompressed: 0, skipped: 0 };
  if (typeof createImageBitmap !== 'function') {
    // no decoder in this environment (a test runner, a worker): nothing is "skipped" in the document sense
    return { bytes, images: report };
  }

  const seen = new Set<PDFRef>();

  for (const page of doc.getPages()) {
    const resources = page.node.Resources();
    const xobjects = resources?.lookupMaybe(PDFName.of('XObject'), PDFDict);
    if (!xobjects) continue;

    for (const [, reference] of xobjects.entries()) {
      if (!(reference instanceof PDFRef) || seen.has(reference)) continue;
      seen.add(reference);
      const looked = doc.context.lookupMaybe(reference, PDFStream);
      if (!(looked instanceof PDFRawStream)) continue;
      const stream = looked;

      const dict = stream.dict;
      if (dict.lookup(PDFName.of('Subtype')) !== PDFName.of('Image')) continue;
      // a mask, a spot colour or a JPEG 2000 stream is not something a canvas round trip can keep honest
      const unsupported =
        dict.lookup(PDFName.of('Filter')) !== PDFName.of('DCTDecode') ||
        dict.has(PDFName.of('SMask')) ||
        dict.has(PDFName.of('ImageMask')) ||
        dict.lookup(PDFName.of('ColorSpace')) === PDFName.of('DeviceCMYK');
      if (unsupported) {
        report.skipped += 1;
        continue;
      }

      const replaced = await shrinkJpeg(stream.contents, dict, quality, maxEdge).catch(() => null);
      if (!replaced) {
        report.skipped += 1;
        continue;
      }
      doc.context.assign(reference, PDFRawStream.of(dict, replaced.bytes));
      dict.set(PDFName.of('Width'), PDFNumber.of(replaced.width));
      dict.set(PDFName.of('Height'), PDFNumber.of(replaced.height));
      report.recompressed += 1;
    }
  }

  const output = await doc.save({ useObjectStreams: true });
  return { bytes: output, images: report };
}

async function shrinkJpeg(
  contents: Uint8Array,
  dict: PDFDict,
  quality: number,
  maxEdge: number,
): Promise<{ bytes: Uint8Array; width: number; height: number } | null> {
  const bitmap = await createImageBitmap(new Blob([new Uint8Array(contents)], { type: 'image/jpeg' }));
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) return null;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  // never grow an image: a re-encode that costs bytes is not a compression
  if (bytes.byteLength >= contents.byteLength) return null;

  // the new stream is a plain JPEG: the old decode parameters describe the old encoding
  dict.delete(PDFName.of('DecodeParms'));
  dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
  return { bytes, width, height };
}
