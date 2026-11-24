import type { SearchHit } from '@lembaran/framework';
import type { PDFDocumentProxy } from '../open';

const EXCERPT_BEFORE = 28;
const EXCERPT_AFTER = 60;

export function excerpt(text: string, query: string): string {
  const at = text.toLowerCase().indexOf(query.toLowerCase());
  if (at === -1) return text.slice(0, EXCERPT_BEFORE + EXCERPT_AFTER);
  const start = Math.max(0, at - EXCERPT_BEFORE);
  const end = Math.min(text.length, at + query.length + EXCERPT_AFTER);
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}

/** Reads every page's text. Slower than an index, honest for a local reader. */
export async function searchDocument(
  doc: PDFDocumentProxy,
  query: string,
  isCancelled: () => boolean = () => false,
): Promise<SearchHit[]> {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return [];

  const hits: SearchHit[] = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    if (isCancelled()) return hits;
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? item.str : ' '))
      .join(' ')
      .replace(/\s+/g, ' ');

    if (text.toLowerCase().includes(needle)) {
      hits.push({ index: hits.length, text: excerpt(text, needle), target: { page: pageNumber } });
    }
    page.cleanup();
  }
  return hits;
}

export async function exportDocumentText(doc: PDFDocumentProxy): Promise<string> {
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join('')
        .trim(),
    );
    page.cleanup();
  }
  return pages.join('\n\n');
}
