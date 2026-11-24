import { useCallback, useEffect, useRef, useState } from 'react';
import { readSource, type DocumentSource } from '@lembaran/framework';
import { EmptyState, onZoomRequest, useFullscreen, useIsMobile } from '@lembaran/ui';
import { openFromDisk } from './feature/open';
import { renderDocx } from './feature/render';
import { activateHit, clearHighlights, highlightHits, stepHit as nextHit } from './feature/find';
import { fitZoom, stepZoom } from './feature/zoom';
import { DocsShell, type DocsShellProps } from './presentations/layout/DocsShell';
import { DocsMobileShell } from './presentations/mobile/DocsMobileShell';

interface Props {
  source?: DocumentSource | null;
}

export function DocsApp({ source = null }: Props) {
  const [current, setCurrent] = useState<DocumentSource | null>(source);
  const [pages, setPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hitList, setHitList] = useState<HTMLElement[]>([]);
  const [hitIndex, setHitIndex] = useState(-1);
  const [viewportWidth, setViewportWidth] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const renderToken = useRef(0);

  const mobile = useIsMobile();
  const fullscreen = useFullscreen(rootRef);

  useEffect(() => {
    if (!current) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const update = () => setViewportWidth(viewport.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [current]);

  useEffect(() => {
    if (!current) return;
    const host = paperRef.current;
    if (!host) return;

    const token = (renderToken.current += 1);
    setBusy(true);
    setError(null);
    setPages(0);
    setPage(0);
    setQuery('');
    setHitList([]);
    setHitIndex(-1);

    const run = async () => {
      // Lay the document out off-screen and attach it in one step: a second render (or a
      // StrictMode remount) then cannot append its pages alongside the first one's.
      const stage = document.createElement('div');
      const bytes = current.kind === 'bytes' ? current.bytes : await readSource(current.path);
      const result = await renderDocx(bytes, stage);
      if (token !== renderToken.current) return;
      host.replaceChildren(...Array.from(stage.childNodes));
      setPages(result.pages);
      setPageWidth(result.width);
      setBusy(false);
    };

    void run().catch((reason: unknown) => {
      if (token !== renderToken.current) return;
      setBusy(false);
      setError(reason instanceof Error ? reason.message : String(reason));
    });
  }, [current]);

  useEffect(() => {
    if (!fit || pageWidth <= 0 || viewportWidth <= 0) return;
    setZoom(fitZoom(viewportWidth, pageWidth));
  }, [fit, pageWidth, viewportWidth]);

  const open = useCallback(async () => {
    setOpening(true);
    setError(null);
    try {
      const opened = await openFromDisk();
      if (!opened) return;
      setCurrent({ kind: 'bytes', bytes: opened.bytes, name: opened.name, mime: opened.mime });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setOpening(false);
    }
  }, []);


  const zoomIn = useCallback(() => {
    setFit(false);
    setZoom((value) => stepZoom(value, 1));
  }, []);

  const zoomOut = useCallback(() => {
    setFit(false);
    setZoom((value) => stepZoom(value, -1));
  }, []);

  // Ctrl + wheel re-lays the page at the new scale instead of scaling the app around it
  useEffect(() => onZoomRequest((direction) => (direction === 1 ? zoomIn() : zoomOut())), [zoomIn, zoomOut]);

  const fitNow = useCallback(() => setFit(true), []);

  const goToPage = useCallback((index: number) => {
    const paper = paperRef.current;
    const section = paper?.querySelectorAll<HTMLElement>('section.docs-page')[index];
    section?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    setPage(index);
  }, []);

  const stepPage = useCallback(
    (delta: 1 | -1) => {
      const next = Math.min(Math.max(0, page + delta), Math.max(0, pages - 1));
      goToPage(next);
    },
    [goToPage, page, pages],
  );

  const closeFind = useCallback(() => {
    setFindOpen(false);
    setQuery('');
    setHitList([]);
    setHitIndex(-1);
    const paper = paperRef.current;
    if (paper) clearHighlights(paper);
  }, []);

  const applyQuery = useCallback((value: string) => {
    setQuery(value);
    const paper = paperRef.current;
    if (!paper) return;
    const marks = highlightHits(paper, value);
    setHitList(marks);
    setHitIndex(marks.length > 0 ? 0 : -1);
    if (marks.length > 0) activateHit(marks, 0);
  }, []);

  const stepHit = useCallback(
    (direction: 1 | -1) => {
      if (hitList.length === 0) return;
      const next = nextHit(hitIndex, hitList.length, direction);
      setHitIndex(next);
      activateHit(hitList, next);
    },
    [hitIndex, hitList],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.ctrlKey || event.metaKey) {
        if (event.key.toLowerCase() === 'f') {
          event.preventDefault();
          setFindOpen(true);
        }
        return;
      }
      switch (event.key) {
        case '+':
        case '=':
          event.preventDefault();
          zoomIn();
          break;
        case '-':
          event.preventDefault();
          zoomOut();
          break;
        case '0':
          event.preventDefault();
          fitNow();
          break;
        case 'f':
        case 'F':
          event.preventDefault();
          fullscreen.toggle();
          break;
        case 'ArrowRight':
        case 'PageDown':
          event.preventDefault();
          stepPage(1);
          break;
        case 'ArrowLeft':
        case 'PageUp':
          event.preventDefault();
          stepPage(-1);
          break;
        case 'Escape':
          closeFind();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeFind, fitNow, fullscreen, stepPage, zoomIn, zoomOut]);

  if (!current) {
    return (
      <div className="lb-root" ref={rootRef}>
        <EmptyState
          tone={error !== null ? 'error' : 'prompt'}
          title={error !== null ? 'Could not read this file' : 'Open a Word document'}
          body={
            error ?? (
              <>
                A <code>.docx</code> file. It is read here, on this device — nothing is uploaded and the
                document is never modified.
              </>
            )
          }
          action={{
            label: error !== null ? 'Try another file' : 'Choose a file',
            onClick: () => void open(),
            busy: opening,
          }}
        />
      </div>
    );
  }

  const shellProps: DocsShellProps = {
    name: current.name,
    zoom,
    page,
    pages,
    busy: busy || opening,
    error,
    findOpen,
    query,
    hits: hitList.length,
    hitIndex,
    fullscreen,
    rootRef,
    paperRef,
    viewportRef,
    onOpen: () => void open(),
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    onFit: fitNow,
    onPage: stepPage,
    onFind: (open: boolean) => (open ? setFindOpen(true) : closeFind()),
    onQuery: applyQuery,
    onStep: stepHit,
    onScrollPage: setPage,
  };

  return mobile ? <DocsMobileShell {...shellProps} /> : <DocsShell {...shellProps} />;
}
