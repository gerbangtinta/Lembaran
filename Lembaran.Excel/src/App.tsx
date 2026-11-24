import { useCallback, useEffect, useRef, useState } from 'react';
import { readSource, type DocumentSource } from '@lembaran/framework';
import { EmptyState, onZoomRequest, useFullscreen, useIsMobile } from '@lembaran/ui';
import { activateSheet, disposeWorkbook, GRID_HEADER, matchPosition, openXlsx, readCell, searchWorkbook, type CellSelection, type Workbook } from './feature/workbook';
import { openFromDisk } from './feature/open';
import { clampScroll, ensureVisible, revealScroll, stepSheet, stepZoom, type ScrollPoint } from './feature/view';
import { WorkbookShell, type WorkbookShellProps } from './presentations/layout/WorkbookShell';
import { ExcelMobileShell } from './presentations/mobile/ExcelMobileShell';
import type { XlsxTextMatch } from '@betteroffice/xlsx';

interface Props {
  source?: DocumentSource | null;
}

/** A rough cell box, used only to decide whether an arrow key has to scroll. */
const CELL_WIDTH = 88;
const CELL_HEIGHT = 24;

export function ExcelApp({ source = null }: Props) {
  const [current, setCurrent] = useState<DocumentSource | null>(source);
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [zoom, setZoom] = useState(1);
  const [scroll, setScroll] = useState<ScrollPoint>({ x: 0, y: 0 });
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [selection, setSelection] = useState<CellSelection | null>(null);
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState(0);
  const [hitIndex, setHitIndex] = useState(-1);

  const rootRef = useRef<HTMLDivElement>(null);
  const loadToken = useRef(0);
  const workbookRef = useRef<Workbook | null>(null);
  const hits = useRef<XlsxTextMatch[]>([]);
  const hitsQuery = useRef('');

  const mobile = useIsMobile();
  const fullscreen = useFullscreen(rootRef);

  useEffect(() => {
    workbookRef.current = workbook;
  }, [workbook]);

  useEffect(() => {
    if (!current) return;
    const token = (loadToken.current += 1);
    const previous = workbookRef.current;
    if (previous) {
      disposeWorkbook(previous);
      workbookRef.current = null;
    }
    setWorkbook(null);
    setSelection(null);
    setScroll({ x: 0, y: 0 });
    setZoom(1);
    setQuery('');
    setFound(0);
    setHitIndex(-1);
    hits.current = [];
    hitsQuery.current = '';
    setBusy(true);
    setError(null);

    void (async () => {
      const bytes = current.kind === 'bytes' ? current.bytes : await readSource(current.path);
      const opened = await openXlsx(bytes);
      if (token !== loadToken.current) {
        disposeWorkbook(opened);
        return;
      }
      setWorkbook(opened);
      setScroll({ x: opened.info.initialScrollX, y: opened.info.initialScrollY });
      setSelection(readCell(opened, 0, 0));
      setBusy(false);
    })().catch((reason: unknown) => {
      if (token !== loadToken.current) return;
      setBusy(false);
      setError(reason instanceof Error ? reason.message : String(reason));
    });
  }, [current]);

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

  const goSheet = useCallback(
    (index: number) => {
      if (!workbook || index === workbook.info.activeSheet) return;
      const next = activateSheet(workbook, index);
      setWorkbook(next);
      setScroll({ x: next.info.initialScrollX, y: next.info.initialScrollY });
      setSelection(readCell(next, 0, 0));
      setHitIndex(-1);
    },
    [workbook],
  );

  const stepToSheet = useCallback(
    (delta: number) => {
      if (!workbook) return;
      goSheet(stepSheet(workbook.sheets, workbook.info.activeSheet, delta));
    },
    [goSheet, workbook],
  );

  const select = useCallback(
    (row: number, col: number) => {
      if (workbook) setSelection(readCell(workbook, row, col));
    },
    [workbook],
  );

  const moveSelection = useCallback(
    (deltaRow: number, deltaCol: number) => {
      if (!workbook) return;
      const row = Math.max(0, (selection?.row ?? 0) + deltaRow);
      const col = Math.max(0, (selection?.col ?? 0) + deltaCol);
      setSelection(readCell(workbook, row, col));
      const position = workbook.handle.cellPosition(workbook.info.activeSheet, row, col);
      const width = Math.max(1, (viewport.width - GRID_HEADER) / zoom);
      const height = Math.max(1, (viewport.height - GRID_HEADER) / zoom);
      setScroll((current) =>
        ensureVisible(position, CELL_WIDTH, CELL_HEIGHT, current, width, height, workbook.info.contentWidth, workbook.info.contentHeight),
      );
    },
    [selection, viewport.height, viewport.width, workbook, zoom],
  );

  const page = useCallback(
    (direction: 1 | -1) => {
      if (!workbook) return;
      const width = Math.max(1, (viewport.width - GRID_HEADER) / zoom);
      const height = Math.max(1, (viewport.height - GRID_HEADER) / zoom);
      setScroll((current) =>
        clampScroll(
          { x: current.x, y: current.y + direction * Math.max(40, height * 0.85) },
          workbook.info.contentWidth,
          workbook.info.contentHeight,
          width,
          height,
        ),
      );
    },
    [viewport.height, viewport.width, workbook, zoom],
  );

  const resetView = useCallback(() => {
    setZoom(1);
    if (workbook) setScroll({ x: workbook.info.initialScrollX, y: workbook.info.initialScrollY });
  }, [workbook]);

  const reveal = useCallback(
    (match: XlsxTextMatch) => {
      if (!workbook) return;
      const active = match.sheet === workbook.info.activeSheet ? workbook : activateSheet(workbook, match.sheet);
      if (active !== workbook) setWorkbook(active);
      const position = matchPosition(active, match);
      const width = Math.max(1, (viewport.width - GRID_HEADER) / zoom);
      const height = Math.max(1, (viewport.height - GRID_HEADER) / zoom);
      setScroll(revealScroll(position, active.info.contentWidth, active.info.contentHeight, width, height));
      setSelection(readCell(active, match.row, match.col));
    },
    [viewport.height, viewport.width, workbook, zoom],
  );

  const findStep = useCallback(
    (direction: 1 | -1) => {
      if (!workbook) return;
      const text = query.trim();
      if (text.length === 0) return;
      if (hitsQuery.current !== text || hits.current.length === 0) {
        hitsQuery.current = text;
        hits.current = searchWorkbook(workbook, text);
        setFound(hits.current.length);
        setHitIndex(-1);
      }
      const list = hits.current;
      if (list.length === 0) return;
      const base = hitIndex < 0 ? (direction > 0 ? -1 : 0) : hitIndex;
      const next = (base + direction + list.length) % list.length;
      setHitIndex(next);
      const match = list[next];
      if (match) reveal(match);
    },
    [hitIndex, query, reveal, workbook],
  );

  const onQuery = useCallback((value: string) => {
    setQuery(value);
    setFound(0);
    setHitIndex(-1);
    hits.current = [];
    hitsQuery.current = '';
  }, []);

  const onViewport = useCallback((width: number, height: number) => {
    setViewport((current) => (current.width === width && current.height === height ? current : { width, height }));
  }, []);


  const zoomIn = useCallback(() => setZoom((value) => stepZoom(value, 1)), []);
  const zoomOut = useCallback(() => setZoom((value) => stepZoom(value, -1)), []);

  // Ctrl + wheel re-lays the page at the new scale instead of scaling the app around it
  useEffect(() => onZoomRequest((direction) => (direction === 1 ? zoomIn() : zoomOut())), [zoomIn, zoomOut]);
  const toggleFind = useCallback(() => setFindOpen((open) => !open), []);
  const closeFind = useCallback(() => setFindOpen(false), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target !== null && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      if (typing) return;
      if (event.ctrlKey || event.metaKey) {
        if (event.key.toLowerCase() === 'f') {
          event.preventDefault();
          setFindOpen(true);
        }
        if (event.key === 'PageDown') {
          event.preventDefault();
          stepToSheet(1);
        }
        if (event.key === 'PageUp') {
          event.preventDefault();
          stepToSheet(-1);
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
          resetView();
          break;
        case 'f':
        case 'F':
          event.preventDefault();
          fullscreen.toggle();
          break;
        case 'ArrowUp':
          event.preventDefault();
          moveSelection(-1, 0);
          break;
        case 'ArrowDown':
          event.preventDefault();
          moveSelection(1, 0);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          moveSelection(0, -1);
          break;
        case 'ArrowRight':
          event.preventDefault();
          moveSelection(0, 1);
          break;
        case 'PageDown':
          event.preventDefault();
          page(1);
          break;
        case 'PageUp':
          event.preventDefault();
          page(-1);
          break;
        case 'Home':
          event.preventDefault();
          select(0, 0);
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
  }, [closeFind, fullscreen, moveSelection, page, resetView, select, stepToSheet, zoomIn, zoomOut]);

  if (!current) {
    return (
      <div className="lb-root" ref={rootRef}>
        <EmptyState
          tone={error !== null ? 'error' : 'prompt'}
          title={error !== null ? 'Could not read this file' : 'Open a spreadsheet'}
          body={
            error ?? (
              <>
                An <code>.xlsx</code> or <code>.xlsm</code> file. Sheets are laid out and formulas are
                calculated on this device — nothing is uploaded, and the file is never modified. The old
                binary <code>.xls</code> format is not supported; save it as <code>.xlsx</code> first.
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

  const shellProps: WorkbookShellProps = {
    name: current.name,
    workbook,
    zoom,
    scroll,
    viewport,
    selection,
    busy: busy || opening,
    error,
    fullscreen,
    rootRef,
    find: { open: findOpen, query, found, index: hitIndex },
    onOpen: () => void open(),
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    onResetZoom: resetView,
    onToggleFind: toggleFind,
    onQuery,
    onFindStep: findStep,
    onCloseFind: closeFind,
    onScroll: setScroll,
    onViewport,
    onSelect: select,
    onSheet: goSheet,
    onStepSheet: stepToSheet,
    onPaintError: setError,
  };

  return mobile ? <ExcelMobileShell {...shellProps} /> : <WorkbookShell {...shellProps} />;
}
