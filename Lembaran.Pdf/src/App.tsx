import { useCallback, useEffect, useRef, useState } from 'react';
import type { DocumentSource } from '@lembaran/framework';
import { useIsMobile } from '@lembaran/ui';
import { useAnnotations } from './feature/annotate';
import { useFullscreen } from '@lembaran/ui';
import { openFromDisk, usePdfDocument } from './feature/open';
import { exportDocumentText, searchDocument, useSearch } from './feature/search';
import { useShortcuts } from './feature/shortcuts';
import { nextZoom, previousZoom } from './feature/zoom';
import type { PdfReaderApi } from './state/api';
import { documentKey, loadSourceBytes } from './state/document';
import { EmptyState } from '@lembaran/ui';
import { PdfShell, type ShellProps } from './presentations/layout/PdfShell';
import type { PdfViewportApi } from './presentations/layout/viewport/PdfViewport';
import { PdfMobileShell } from './presentations/mobile/PdfMobileShell';

interface Props {
  source?: DocumentSource | null;
  assetBase: string;
  apiRef?: { current: PdfReaderApi | null };
}

export function PdfApp({ source = null, assetBase, apiRef }: Props) {
  const [current, setCurrent] = useState<DocumentSource | null>(source);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [opening, setOpening] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [railOpen, setRailOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  const viewportApi = useRef<PdfViewportApi | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const mobile = useIsMobile();
  const { doc, loading, error } = usePdfDocument(bytes, assetBase);
  const search = useSearch(doc);
  const annotations = useAnnotations(documentKey(current));
  const fullscreen = useFullscreen(rootRef);

  useEffect(() => {
    if (!current) {
      setBytes(null);
      return;
    }
    let cancelled = false;
    loadSourceBytes(current)
      .then((loaded) => {
        if (!cancelled) setBytes(loaded);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setLocalError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      cancelled = true;
    };
  }, [current]);

  useEffect(() => {
    if (!doc) return;
    setPage((value) => Math.min(value, doc.numPages));
    setRailOpen(!matchMedia('(max-width: 900px)').matches);
  }, [doc]);

  // Showing or hiding the rail changes the width the page is fitted to.
  useEffect(() => {
    viewportApi.current?.refit();
  }, [railOpen]);

  const open = useCallback(async () => {
    setOpening(true);
    setLocalError(null);
    try {
      const opened = await openFromDisk();
      if (!opened) return;
      setZoom(1);
      setPage(1);
      setSearchOpen(false);
      setCurrent({ kind: 'bytes', bytes: opened.bytes, name: opened.name, mime: 'application/pdf' });
    } catch (reason) {
      setLocalError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setOpening(false);
    }
  }, []);

  const numPages = doc?.numPages ?? 1;

  const goTo = useCallback(
    (next: number) => {
      const target = Math.min(numPages, Math.max(1, Math.round(next)));
      viewportApi.current?.goToPage(target);
    },
    [numPages],
  );

  const zoomIn = useCallback(() => setZoom((value) => nextZoom(value)), []);
  const zoomOut = useCallback(() => setZoom((value) => previousZoom(value)), []);
  const fit = useCallback(() => viewportApi.current?.fitWidth(), []);
  const applyFit = useCallback((next: number) => setZoom(next), []);
  const toggleSearch = useCallback(() => setSearchOpen((open_) => !open_), []);
  const toggleAnnotate = useCallback(
    () => annotations.setTool(annotations.tool === 'highlight' ? 'none' : 'highlight'),
    [annotations],
  );

  useShortcuts({
    nextPage: () => goTo(page + 1),
    previousPage: () => goTo(page - 1),
    zoomIn,
    zoomOut,
    fitWidth: fit,
    toggleSearch,
    toggleAnnotate,
    toggleFullscreen: fullscreen.toggle,
    closeOverlays: () => {
      setSearchOpen(false);
      annotations.select(null);
    },
  });

  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      goToPage: (next) => goTo(next),
      search: (query) => (doc ? searchDocument(doc, query) : Promise.resolve([])),
      exportText: () => (doc ? exportDocumentText(doc) : Promise.resolve('')),
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, doc, goTo]);

  if (!current) {
    return (
      <div className="lb-root" ref={rootRef}>
        <EmptyState
          title="Lembaran PDF"
          body="Read a PDF in the browser. Nothing is uploaded — the file stays on this device."
          action={{ label: 'Open a PDF', onClick: () => void open(), busy: opening }}
        />
      </div>
    );
  }

  const failure = localError ?? error;
  if (failure !== null) {
    return (
      <div className="lb-root" ref={rootRef}>
        <EmptyState
          tone="error"
          title="Could not open this document"
          body={failure}
          action={{ label: 'Try another file', onClick: () => void open() }}
        />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="pdf-loading">
        <span className="pdf-spinner" aria-hidden="true" />
        {loading ? `Opening ${current.name}…` : 'Preparing…'}
      </div>
    );
  }

  const shellProps: ShellProps = {
    doc,
    title: current.name,
    page,
    zoom,
    busy: opening,
    search,
    annotations,
    fullscreen,
    viewportApi,
    rootRef,
    railOpen,
    searchOpen,
    onToggleRail: () => setRailOpen((value) => !value),
    onToggleSearch: toggleSearch,
    onGoTo: goTo,
    onPageChange: setPage,
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    onFit: fit,
    onFitScale: applyFit,
    onOpen: () => void open(),
  };

  return mobile ? <PdfMobileShell {...shellProps} /> : <PdfShell {...shellProps} />;
}
