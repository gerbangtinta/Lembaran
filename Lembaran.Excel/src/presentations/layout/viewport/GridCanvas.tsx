import { useEffect, useRef, useState } from 'react';
import { loadStandardFonts } from '@lembaran/ui';
import {
  GRID_HEADER,
  cellUnder,
  paintSheet,
  type CellSelection,
  type PaintTheme,
  type Workbook,
} from '../../../feature/workbook';

interface Props {
  workbook: Workbook;
  zoom: number;
  scroll: { x: number; y: number };
  selection: CellSelection | null;
  onScroll(scroll: { x: number; y: number }): void;
  onSelect(row: number, col: number): void;
  onViewport(width: number, height: number): void;
  onPaintError(message: string): void;
}

/**
 * The virtualized sheet: a native scroller sized to the sheet's extent with a sticky canvas that
 * always shows the visible window. Only the window is ever in the display list, so a million rows
 * cost the same as thirty.
 */
export function GridCanvas({
  workbook,
  zoom,
  scroll,
  selection,
  onScroll,
  onSelect,
  onViewport,
  onPaintError,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<ReturnType<typeof paintSheet>['frame'] | null>(null);
  const raf = useRef(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [fontEpoch, setFontEpoch] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // the canvas paints the workbook's family names; repaint once the substitute face is ready
    void loadStandardFonts().then(() => {
      if (!cancelled) setFontEpoch((value) => value + 1);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const content = {
    width: Math.max(size.width, workbook.info.contentWidth + GRID_HEADER),
    height: Math.max(size.height, workbook.info.contentHeight + GRID_HEADER),
  };

  useEffect(() => {
    const host = scrollRef.current;
    if (!host) return;
    const measure = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      setSize((current) => (current.width === width && current.height === height ? current : { width, height }));
      onViewport(width, height);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [onViewport]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width <= 0 || size.height <= 0) return;
    const styles = getComputedStyle(canvas);
    const read = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
    const theme: PaintTheme = {
      accent: read('--lb-accent', '#8a5a2b'),
      surface: read('--lb-surface', '#ffffff'),
      surface2: read('--lb-surface-2', '#f1efec'),
      border: read('--lb-border', '#d9d5cf'),
      text: read('--lb-text', '#1d1b19'),
      textDim: read('--lb-text-dim', '#6b655e'),
    };
    try {
      const painted = paintSheet(
        workbook,
        canvas,
        { scrollX: scroll.x, scrollY: scroll.y, width: size.width, height: size.height, zoom },
        selection,
        theme,
      );
      frameRef.current = painted.frame;
    } catch (reason) {
      onPaintError(reason instanceof Error ? reason.message : String(reason));
    }
  }, [fontEpoch, onPaintError, scroll, selection, size.height, size.width, workbook, zoom]);

  // a jump from find moves the native scroller too; the scroll handler then repaints at that offset
  useEffect(() => {
    const host = scrollRef.current;
    if (!host) return;
    if (Math.abs(host.scrollLeft - scroll.x) > 1) host.scrollLeft = scroll.x;
    if (Math.abs(host.scrollTop - scroll.y) > 1) host.scrollTop = scroll.y;
  }, [scroll.x, scroll.y]);

  useEffect(
    () => () => {
      if (raf.current !== 0) cancelAnimationFrame(raf.current);
    },
    [],
  );

  const handleScroll = () => {
    if (raf.current !== 0) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const host = scrollRef.current;
      if (host) onScroll({ x: host.scrollLeft, y: host.scrollTop });
    });
  };

  const handlePointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    // the display list was built at viewport ÷ zoom behind the header bands, so a click maps back
    // through the same offset and scale; a click on a header is not a cell
    const x = (event.clientX - rect.left - GRID_HEADER) / zoom;
    const y = (event.clientY - rect.top - GRID_HEADER) / zoom;
    if (x < 0 || y < 0) return;
    const cell = cellUnder(frameRef.current, x, y);
    if (cell) onSelect(cell.row, cell.col);
  };

  const sheetName = workbook.sheets[workbook.info.activeSheet]?.name ?? 'Sheet';

  return (
    <div className="xl-scroll" ref={scrollRef} onScroll={handleScroll}>
      <div className="xl-holder" style={{ width: content.width, height: content.height }}>
        <canvas
          ref={canvasRef}
          className="xl-canvas"
          role="img"
          aria-label={`Grid of ${sheetName}`}
          onPointerDown={handlePointer}
        />
      </div>
    </div>
  );
}
