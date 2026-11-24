import { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from '../../../feature/open';
import type { AnnotationsState } from '../../../feature/annotate';
import { fitZoom } from '../../../feature/zoom';
import { offsetForPage, PAGE_ASPECT, pageAtOffset } from '../../../feature/paginate';
import { PageCanvas } from './PageCanvas';

export interface PdfViewportApi {
  goToPage(page: number): void;
  currentPage(): number;
  fitWidth(): void;
  /** recompute the opening fit, only while the reader is still at that fit */
  refit(): void;
}

interface Props {
  doc: PDFDocumentProxy;
  scale: number;
  annotations: AnnotationsState;
  onPageChange(page: number): void;
  onFitScale(scale: number): void;
  apiRef: { current: PdfViewportApi | null };
}

/** Continuous, virtualized page list. Only pages near the viewport are drawn. */
export function PdfViewport({ doc, scale, annotations, onPageChange, onFitScale, apiRef }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const slots = useRef(new Map<number, HTMLDivElement>());
  const frame = useRef(0);
  const pageWidth = useRef(0);
  const lastFit = useRef<number | null>(null);
  const [baseWidth, setBaseWidth] = useState(0);
  /**
   * The page the reader is on. Pages around it are painted — computed from the scroll position,
   * never from an IntersectionObserver: an observer that has not delivered yet leaves the stack
   * blank, which is indistinguishable from a broken document.
   */
  const [anchor, setAnchor] = useState(1);

  const register = useCallback((pageNumber: number, element: HTMLDivElement | null) => {
    if (element) slots.current.set(pageNumber, element);
    else slots.current.delete(pageNumber);
  }, []);

  const collectOffsets = useCallback(() => {
    const offsets: number[] = [];
    for (let page = 1; page <= doc.numPages; page += 1) {
      offsets.push(slots.current.get(page)?.offsetTop ?? 0);
    }
    return offsets;
  }, [doc.numPages]);

  const onScroll = useCallback(() => {
    if (frame.current !== 0) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const page = pageAtOffset(collectOffsets(), scrollRef.current?.scrollTop ?? 0);
      setAnchor(page);
      onPageChange(page);
    });
  }, [collectOffsets, onPageChange]);

  useEffect(() => {
    onScroll();
    return () => {
      if (frame.current !== 0) {
        cancelAnimationFrame(frame.current);
        // the guard above reads this ref: leaving the stale id behind would make every later
        // scroll return early, which reads as "the page counter never changes"
        frame.current = 0;
      }
    };
  }, [onScroll]);

  // Fit to width once per document: a page wider than a phone must not open clipped.
  // The element can still be unmeasured on the first frame, so wait for a width.
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const fit = async () => {
      if (cancelled) return;
      const element = scrollRef.current;
      const available = element?.clientWidth ?? 0;
      if (available <= 0) {
        if (attempts < 20) {
          attempts += 1;
          setTimeout(() => void fit(), 50);
        }
        return;
      }
      const page = await doc.getPage(1);
      if (cancelled) return;
      const width = page.getViewport({ scale: 1 }).width;
      page.cleanup();
      if (width > 0) {
        pageWidth.current = width;
        setBaseWidth(width);
        // Open at fit-width, but never magnified: a small page should read at 100%,
        // not fill a wide screen. The Fit button still does a true fit.
        const fitted = Math.min(1, fitZoom(available, width));
        lastFit.current = fitted;
        onFitScale(fitted);
      }
    };

    void fit();
    return () => {
      cancelled = true;
    };
  }, [doc, onFitScale]);

  useEffect(() => {
    apiRef.current = {
      goToPage: (page) => {
        const element = scrollRef.current;
        if (!element) return;
        element.scrollTop = offsetForPage(collectOffsets(), page);
        setAnchor(page);
        onPageChange(page);
      },
      currentPage: () => pageAtOffset(collectOffsets(), scrollRef.current?.scrollTop ?? 0),
      fitWidth: () => {
        const element = scrollRef.current;
        if (!element || pageWidth.current <= 0) return;
        const fitted = fitZoom(element.clientWidth, pageWidth.current);
        lastFit.current = fitted;
        onFitScale(fitted);
      },
      refit: () => {
        const element = scrollRef.current;
        if (!element || pageWidth.current <= 0) return;
        if (lastFit.current === null || Math.abs(scale - lastFit.current) > 0.001) return;
        const fitted = Math.min(1, fitZoom(element.clientWidth, pageWidth.current));
        lastFit.current = fitted;
        onFitScale(fitted);
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, collectOffsets, onPageChange, onFitScale, scale]);

  const pages: number[] = [];
  for (let page = 1; page <= doc.numPages; page += 1) pages.push(page);

  return (
    <div className="pdf-viewport" ref={scrollRef} onScroll={onScroll} tabIndex={0}>
      <div className="pdf-pages">
        {pages.map((page) => (
          <PageSlot
            key={page}
            doc={doc}
            pageNumber={page}
            scale={scale}
            baseWidth={baseWidth}
            annotations={annotations}
            active={page <= 2 || Math.abs(page - anchor) <= 1}
            onRegister={register}
          />
        ))}
      </div>
    </div>
  );
}

interface SlotProps {
  doc: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  baseWidth: number;
  annotations: AnnotationsState;
  /** painted, because it is at or near the page the reader is on */
  active: boolean;
  onRegister(pageNumber: number, element: HTMLDivElement | null): void;
}

function PageSlot({ doc, pageNumber, scale, baseWidth, annotations, active, onRegister }: SlotProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    onRegister(pageNumber, element);
    return () => onRegister(pageNumber, null);
  }, [pageNumber, onRegister]);

  // the page's own width, not a guess: the slot must not add phantom space
  const width = (baseWidth || 640) * scale;

  return (
    <div
      className="pdf-slot"
      ref={ref}
      style={active ? { width } : { width, height: width * PAGE_ASPECT }}
      data-page={pageNumber}
    >
      {active ? (
        <PageCanvas doc={doc} pageNumber={pageNumber} scale={scale} annotations={annotations} />
      ) : null}
    </div>
  );
}
