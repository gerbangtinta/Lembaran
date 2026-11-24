import { renderAsync } from 'docx-preview';
import { loadStandardFonts } from '@lembaran/ui';

export interface RenderResult {
  pages: number;
  /** page width in CSS pixels, before any reader zoom */
  width: number;
}

/**
 * docx-preview lays the document out as real pages (`section.docs-page`), so the reader
 * gets page breaks, headers, footnotes and table layout without owning a layout engine.
 * Images are inlined as data URLs: a document must never cause a network request.
 */
export async function renderDocx(bytes: Uint8Array, host: HTMLElement): Promise<RenderResult> {
  const data = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

  // measure with the same faces the pages will use, or pagination shifts when a face arrives late
  await loadStandardFonts().catch(() => undefined);

  host.replaceChildren();
  await renderAsync(data, host, host, {
    className: 'docs-page',
    inWrapper: true,
    breakPages: true,
    ignoreWidth: false,
    ignoreHeight: false,
    ignoreFonts: false,
    renderHeaders: true,
    renderFooters: true,
    renderFootnotes: true,
    renderEndnotes: true,
    ignoreLastRenderedPageBreak: true,
    useBase64URL: true,
    experimental: false,
  });

  const first = host.querySelector<HTMLElement>('section.docs-page');
  return {
    pages: host.querySelectorAll('section.docs-page').length,
    width: pageWidthOf(first),
  };
}

/** docx-preview declares the page width inline; `offsetWidth` is the fallback. */
export function pageWidthOf(section: HTMLElement | null): number {
  if (!section) return 0;
  const declared = Number.parseFloat(section.style.width);
  if (Number.isFinite(declared) && declared > 0) return declared;
  return section.offsetWidth;
}
