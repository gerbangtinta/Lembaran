import { useEffect, useRef, useState } from 'react';
import {
  COLUMN_WIDTH,
  GUTTER_WIDTH,
  ROW_HEIGHT,
  columnName,
  visibleColumns,
  visibleRange,
  type CsvTable,
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
}

function indexes(range: Range): number[] {
  if (range.last < range.first) return [];
  return Array.from({ length: range.last - range.first + 1 }, (_, offset) => range.first + offset);
}

/** A virtualized grid: only the visible window is in the DOM. */
export function CsvGrid({ table, selected, onSelect }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ top: 0, left: 0, height: 0, width: 0 });

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

  const rows = visibleRange(box.top, box.height, table.rows.length);
  const cols = visibleColumns(box.left, box.width, table.columns);
  const totalWidth = GUTTER_WIDTH + table.columns * COLUMN_WIDTH;
  const totalHeight = table.rows.length * ROW_HEIGHT;
  const colOffset = cols.first * COLUMN_WIDTH;

  return (
    <div className="csv-grid">
      <div className="csv-head">
        <div className="csv-head-inner" style={{ width: totalWidth, transform: `translateX(${-box.left}px)` }}>
          <span className="csv-corner" style={{ width: GUTTER_WIDTH }}>
            {table.rows.length > 0 ? '#' : ''}
          </span>
          <div className="csv-head-cells" style={{ paddingLeft: colOffset }}>
            {indexes(cols).map((col) => (
              <span key={col} className="csv-colname" style={{ width: COLUMN_WIDTH }}>
                {columnName(col)}
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
            <div key={row} className={`csv-row${row % 2 ? ' is-alt' : ''}`} style={{ top: row * ROW_HEIGHT, height: ROW_HEIGHT }}>
              <span className="csv-rownum" style={{ width: GUTTER_WIDTH }}>
                {row + 1}
              </span>
              <div className="csv-cells" style={{ paddingLeft: colOffset }}>
                {indexes(cols).map((col) => {
                  const value = table.rows[row]?.[col] ?? '';
                  const isSelected = selected?.row === row && selected?.col === col;
                  return (
                    <span
                      key={col}
                      className={`csv-cell${isSelected ? ' is-selected' : ''}`}
                      style={{ width: COLUMN_WIDTH }}
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
