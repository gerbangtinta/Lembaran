import { useEffect, useMemo, useRef, useState } from 'react';
import {
  COLUMN_WIDTH,
  GUTTER_WIDTH,
  clampColumnWidth,
  clampRowHeight,
  columnName,
  columnOffsets,
  useGridSizes,
  visibleRange,
  visibleSlice,
  type CsvTable,
  type GridSizes,
  type Range,
} from '../../../feature/grid';

export interface SelectedCell {
  row: number;
  col: number;
  value: string;
}

interface Props {
  table: CsvTable;
  selected: SelectedCell | null;
  onSelect(cell: SelectedCell | null): void;
  /** where the remembered column widths live — one document, one shape */
  docKey?: string;
}

type Drag =
  | { kind: 'column'; index: number; startX: number; startWidth: number }
  | { kind: 'row'; startY: number; startHeight: number };

function indexes(range: Range): number[] {
  if (range.last < range.first) return [];
  return Array.from({ length: range.last - range.first + 1 }, (_, offset) => range.first + offset);
}

function widthAt(sizes: GridSizes, index: number): number {
  return sizes.columns[index] ?? COLUMN_WIDTH;
}

/** A virtualized grid: only the visible window is in the DOM, and a border can be dragged to resize. */
export function CsvGrid({ table, selected, onSelect, docKey }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ top: 0, left: 0, height: 0, width: 0 });
  const [drag, setDrag] = useState<Drag | null>(null);
  const { sizes, resizeColumn, resetColumn, setRowHeight, resetRowHeight } = useGridSizes(
    docKey ?? `untitled:${table.columns}x${table.rows.length}`,
  );

  useEffect(() => {
    const element = bodyRef.current;
    if (!element) return;
    const measure = () =>
      setBox((current) => ({ ...current, height: element.clientHeight, width: element.clientWidth }));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // the drag is tracked on the window: the pointer leaves the 8 px grip immediately
  useEffect(() => {
    if (drag === null) return;
    const move = (event: PointerEvent) => {
      if (drag.kind === 'column') {
        resizeColumn(drag.index, clampColumnWidth(drag.startWidth + event.clientX - drag.startX));
      } else {
        setRowHeight(clampRowHeight(drag.startHeight + event.clientY - drag.startY));
      }
    };
    const up = () => setDrag(null);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [drag, resizeColumn, setRowHeight]);

  const offsets = useMemo(() => columnOffsets(sizes, table.columns), [sizes, table.columns]);
  const rows = visibleRange(box.top, box.height, table.rows.length, sizes.rowHeight);
  const cols = visibleSlice(offsets, box.left, box.width);
  const totalWidth = GUTTER_WIDTH + (offsets[table.columns] ?? 0);
  const totalHeight = table.rows.length * sizes.rowHeight;
  const colOffset = offsets[cols.first] ?? 0;
  const resizing = drag === null ? '' : drag.kind === 'column' ? ' is-col-resizing' : ' is-row-resizing';

  return (
    <div className={`csv-grid${resizing}`}>
      <div className="csv-head">
        <div className="csv-head-inner" style={{ width: totalWidth, transform: `translateX(${-box.left}px)` }}>
          <span className="csv-corner" style={{ width: GUTTER_WIDTH }}>
            {table.rows.length > 0 ? '#' : ''}
          </span>
          <div className="csv-head-cells" style={{ paddingLeft: colOffset }}>
            {indexes(cols).map((col) => (
              <span key={col} className="csv-colname" style={{ width: widthAt(sizes, col) }}>
                {columnName(col)}
                <span
                  className="csv-grip csv-grip-col"
                  role="separator"
                  aria-orientation="vertical"
                  aria-label={`Resize column ${columnName(col)}`}
                  title="Drag to resize · double-click to reset"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    setDrag({
                      kind: 'column',
                      index: col,
                      startX: event.clientX,
                      startWidth: widthAt(sizes, col),
                    });
                  }}
                  onDoubleClick={() => resetColumn(col)}
                />
              </span>
            ))}
          </div>
        </div>
      </div>

      <div
        className="csv-body"
        ref={bodyRef}
        onScroll={(event) => {
          // read before the updater runs: React resets currentTarget after the handler
          const { scrollTop, scrollLeft } = event.currentTarget;
          setBox((current) => ({ ...current, top: scrollTop, left: scrollLeft }));
        }}
      >
        <div className="csv-canvas" style={{ width: totalWidth, height: totalHeight }}>
          {indexes(rows).map((row) => (
            <div
              key={row}
              className={`csv-row${row % 2 ? ' is-alt' : ''}`}
              style={{ top: row * sizes.rowHeight, height: sizes.rowHeight }}
            >
              <span className="csv-rownum" style={{ width: GUTTER_WIDTH }}>
                {row + 1}
                <span
                  className="csv-grip csv-grip-row"
                  role="separator"
                  aria-orientation="horizontal"
                  aria-label="Resize the rows"
                  title="Drag to resize every row · double-click to reset"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    setDrag({ kind: 'row', startY: event.clientY, startHeight: sizes.rowHeight });
                  }}
                  onDoubleClick={resetRowHeight}
                />
              </span>
              <div className="csv-cells" style={{ paddingLeft: colOffset }}>
                {indexes(cols).map((col) => {
                  const value = table.rows[row]?.[col] ?? '';
                  const isSelected = selected?.row === row && selected?.col === col;
                  return (
                    <span
                      key={col}
                      className={`csv-cell${isSelected ? ' is-selected' : ''}`}
                      style={{ width: widthAt(sizes, col) }}
                      title={value}
                      onClick={() => onSelect({ row, col, value })}
                    >
                      {value}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
