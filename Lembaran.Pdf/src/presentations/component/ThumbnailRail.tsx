import { PanelItem, RailThumb, SidePanel } from '@lembaran/ui';
import { useCallback } from 'react';
import type { PDFDocumentProxy } from '../../feature/open';

interface Props {
  doc: PDFDocumentProxy;
  page: number;
  /** pages carrying notes, for the dot on the rail */
  marked: ReadonlySet<number>;
  /** width ÷ height of page 1, so every card is the shape of the paper */
  aspect: number;
  onSelect(page: number): void;
}

/** Above this many pages the rail paints on demand instead of all at once. */
const EAGER_PAGES = 60;

/** Page rail. Each thumbnail renders only when it is near the rail's viewport. */
export function ThumbnailRail({ doc, page, marked, aspect, onSelect }: Props) {
  const pages: number[] = [];
  for (let index = 1; index <= doc.numPages; index += 1) pages.push(index);
  const eager = doc.numPages <= EAGER_PAGES;

  return (
    <SidePanel label="Pages">
      {pages.map((number) => (
        <PanelItem
          key={number}
          number={number}
          label={`Page ${number}`}
          current={number === page}
          aspect={aspect}
          noted={marked.has(number)}
          onSelect={() => onSelect(number)}
        >
          <PageThumb doc={doc} pageNumber={number} eager={eager} />
        </PanelItem>
      ))}
    </SidePanel>
  );
}

/** The rail owns the card and the lazy painting; pdf.js draws the pixels. */
function PageThumb({ doc, pageNumber, eager }: { doc: PDFDocumentProxy; pageNumber: number; eager: boolean }) {
  const paint = useCallback(
    async (canvas: HTMLCanvasElement, width: number, signal: AbortSignal) => {
      const page = await doc.getPage(pageNumber);
      if (signal.aborted) {
        page.cleanup();
        return;
      }
      const base = page.getViewport({ scale: 1 });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: (width / base.width) * dpr });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${width}px`;
      const render = page.render({ canvas, viewport });
      signal.addEventListener('abort', () => render.cancel(), { once: true });
      await render.promise.catch(() => undefined);
      page.cleanup();
    },
    [doc, pageNumber],
  );

  return <RailThumb paint={paint} eager={eager} />;
}
