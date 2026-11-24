import { useEffect, type RefObject } from 'react';
import { currentPage } from '../../../feature/paginate';

export interface DocsViewportProps {
  paperRef: RefObject<HTMLDivElement | null>;
  /** the scrolling element the shell's Stage renders */
  viewportRef: RefObject<HTMLDivElement | null>;
  zoom: number;
  /** changes once the document is laid out, which is when the scroll position must be re-read */
  pages: number;
  onPage(page: number): void;
}

/** The rendered pages live in `paperRef`: docx-preview owns that subtree, React does not. */
export function DocsViewport({ paperRef, viewportRef, zoom, pages, onPage }: DocsViewportProps) {
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const top = viewport.getBoundingClientRect().top;
      const sections = viewport.querySelectorAll<HTMLElement>('section.docs-page');
      const tops = [...sections].map((section) => section.getBoundingClientRect().top - top);
      onPage(currentPage(tops, 0));
    };
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(measure);
    };
    viewport.addEventListener('scroll', onScroll, { passive: true });
    measure();
    return () => {
      viewport.removeEventListener('scroll', onScroll);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, [onPage, pages, viewportRef]);

  return <div className="docs-paper" ref={paperRef} style={{ zoom }} />;
}
