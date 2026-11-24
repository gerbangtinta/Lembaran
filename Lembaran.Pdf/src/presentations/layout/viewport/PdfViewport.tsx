import { useCallback, useEffect, useRef, useState } from 'react';
import { Surface } from '@lembaran/ui';
import type { PDFDocumentProxy } from '../../../feature/open';
import type { AnnotationsState } from '../../../feature/annotate';
import { displayBox, type DisplayPage } from '../../../feature/edit';
import { fitZoom } from '../../../feature/zoom';
import { offsetForPage, PAGE_ASPECT, pageAtOffset } from '../../../feature/paginate';
import { PageCanvas, type EditSurface } from './PageCanvas';

export interface PdfViewportApi {
  goToPage(page: number): void;
  currentPage(): number;
  fitWidth(): void;
  /** fit the width of the page to the height of the reader, for a document scanned sideways */
  fitHeight(): void;
  /** the page's own size in points, for a blank page that has to match the paper */
  pageBox(display: number): { width: number; height: number } | null;
  /** recompute the opening fit, only while the reader is still at that fit */
  refit(): void;
}

interface Props {
  doc: PDFDocumentProxy;
  scale: number;
  annotations: AnnotationsState;
  /** the sequence to draw: source pages in order, with deletions, rotations and blanks already applied */
  pages: readonly DisplayPage[];
  /** the placed items and the tool that makes more of them */
  edit: EditSurface;
  /** the find term, marked on the page it is found on */
  searchQuery?: string;
  onPageChange(page: number): void;
  onFitScale(scale: number): void;
  apiRef: { current: PdfViewportApi | null };
}

/** Continuous, virtualized page list. Only pages near the viewport are drawn. */
export function PdfViewport({ doc, scale, annotations, pages, edit, searchQuery, onPageChange, onFitScale, apiRef }: Props) {
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
  /** the paper of every source page, measured once: slots and blank pages both need it */
  const [boxes, setBoxes] = useState<Record<number, { width: number; height: number }>>({});

  useEffect(() => {
    let cancelled = false;
    const sources = [...new Set(pages.map((page) => page.source).filter((page): page is number => page !== null))];
    void Promise.all(
      sources.map(async (source) => {
        const page = await doc.getPage(source).catch(() => null);
        if (!page) return null;
        const box = page.getViewport({ scale: 1, rotation: 0 });
        page.cleanup();
        return [source, { width: box.width, height: box.height }] as const;
      }),
    ).then((pairs) => {
      if (cancelled) return;
      const next: Record<number, { width: number; height: number }> = {};
      for (const pair of pairs) if (pair) next[pair[0]] = pair[1];
      setBoxes(next);
    });
    return () => {
      cancelled = true;
    };
  }, [doc, pages]);

  const register = useCallback((display: number, element: HTMLDivElement | null) => {
    if (element) slots.current.set(display, element);
    else slots.current.delete(display);
  }, []);

  const collectOffsets = useCallback(() => {
    const offsets: number[] = [];
    for (let display = 1; display <= pages.length; display += 1) {
      offsets.push(slots.current.get(display)?.offsetTop ?? 0);
    }
    return offsets;
  }, [pages.length]);

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

  /** the paper a display position shows, once its source page has been measured */
  const paperOf = useCallback(
    (entry: DisplayPage | undefined) =>
      entry ? displayBox(entry, entry.source !== null ? boxes[entry.source] : undefined) : null,
    [boxes],
  );
  const firstPaper = useCallback(() => paperOf(pages[0]), [paperOf, pages]);

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
        if (!element) return;
        const width = firstPaper()?.width ?? pageWidth.current;
        if (width <= 0) return;
        const fitted = fitZoom(element.clientWidth, width);
        lastFit.current = fitted;
        onFitScale(fitted);
      },
      fitHeight: () => {
        const element = scrollRef.current;
        const paper = firstPaper();
        if (!element || !paper) return;
        lastFit.current = null;
        onFitScale(Math.min(1.5, (element.clientHeight - 28) / paper.height));
      },
      pageBox: (display) => paperOf(pages[display - 1]),
      refit: () => {
        const element = scrollRef.current;
        if (!element) return;
        if (lastFit.current === null || Math.abs(scale - lastFit.current) > 0.001) return;
        const width = firstPaper()?.width ?? pageWidth.current;
        if (width <= 0) return;
        const fitted = Math.min(1, fitZoom(element.clientWidth, width));
        lastFit.current = fitted;
        onFitScale(fitted);
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, collectOffsets, firstPaper, onPageChange, onFitScale, pages, paperOf, scale]);

  return (
    <div className="pdf-viewport" ref={scrollRef} onScroll={onScroll} tabIndex={0}>
      <div className="pdf-pages">
        {pages.map((page) => (
          <PageSlot
            key={page.key}
            doc={doc}
            page={page}
            scale={scale}
            baseWidth={baseWidth}
            box={page.source !== null ? boxes[page.source] : undefined}
            annotations={annotations}
            edit={edit}
            searchQuery={searchQuery}
            active={page.display <= 2 || Math.abs(page.display + 1 - anchor) <= 1}
            onRegister={register}
          />
        ))}
      </div>
    </div>
  );
}

interface SlotProps {
  doc: PDFDocumentProxy;
  page: DisplayPage;
  scale: number;
  baseWidth: number;
  /** the page's own paper, in points, once measured */
  box?: { width: number; height: number };
  annotations: AnnotationsState;
  edit: EditSurface;
  searchQuery?: string;
  /** painted, because it is at or near the page the reader is on */
  active: boolean;
  onRegister(display: number, element: HTMLDivElement | null): void;
}

function PageSlot({
  doc,
  page,
  scale,
  baseWidth,
  box,
  annotations,
  edit,
  searchQuery,
  active,
  onRegister,
}: SlotProps) {
  const ref = useRef<HTMLDivElement>(null);
  const display = page.display + 1;
  // a blank page carries its own size; a source page's paper turns with it, so a quarter turn is landscape
  const paper = displayBox(page, box);
  const aspect = paper ? paper.height / paper.width : PAGE_ASPECT;
  const width = paper ? paper.width * scale : (baseWidth || 640) * scale;

  useEffect(() => {
    const element = ref.current;
    onRegister(display, element);
    return () => onRegister(display, null);
  }, [display, onRegister]);

  if (page.source === null) {
    return (
      <div
        className="pdf-slot"
        ref={ref}
        style={{ width, height: width * aspect }}
        data-page={display}
        data-blank="true"
      >
        <Surface className="pdf-page pdf-page-blank" aspect={1 / aspect}>
          <span className="pdf-visually-hidden">Blank page {display}</span>
        </Surface>
      </div>
    );
  }

  return (
    <div
      className="pdf-slot"
      ref={ref}
      style={active ? { width } : { width, height: width * aspect }}
      data-page={display}
    >
      {active ? (
        <PageCanvas
          doc={doc}
          pageNumber={page.source}
          scale={scale}
          rotation={page.rotation}
          annotations={annotations}
          edit={edit}
          searchQuery={searchQuery}
        />
      ) : null}
    </div>
  );
}
