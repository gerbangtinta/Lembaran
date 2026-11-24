import { PhoneShell, Stage } from '@lembaran/ui';
import { DELIMITERS, columnName } from '../../feature/grid';
import type { CsvShellProps } from '../layout/CsvShell';
import { CsvGrid } from '../layout/viewport/CsvGrid';
import './csv-phone.css';

/** Where a cell is, and what it holds — the phone's stand-in for the desktop status line. */
function cellLabel(props: CsvShellProps): string {
  const selected = props.selected;
  if (!selected) return 'Tap a cell to read it';
  const at = `${columnName(selected.col)}${selected.row + 1}`;
  const value = selected.value.length > 28 ? `${selected.value.slice(0, 28)}…` : selected.value;
  return value.length > 0 ? `${at}: ${value}` : at;
}

/**
 * The phone's CSV reader: the grid, a read-out of the selected cell, and three thumb-sized controls.
 * Desktop chrome (toolbar, status line, theme toggle) is not rendered here; it lives in `../layout/`.
 */
export function CsvMobileShell(props: CsvShellProps) {
  const rows = props.table.rows.length.toLocaleString();
  const columns = props.table.columns.toLocaleString();

  return (
    <PhoneShell
      rootRef={props.rootRef}
      title={props.name}
      meta={`${rows} × ${columns}`}
      bar={
        <div className="csv-phone-bar">
          <span className="csv-phone-cell" aria-live="polite" title={props.selected?.value}>
            {cellLabel(props)}
          </span>
          <div className="csv-phone-row">
            <button type="button" className="lb-phone-action" onClick={props.onOpen} aria-label="Open a CSV file">
              Open
            </button>
            <select
              className="csv-phone-select"
              aria-label="Separator"
              value={props.delimiter}
              onChange={(event) => props.onDelimiter(event.target.value)}
            >
              {DELIMITERS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {props.fullscreen.supported && (
              <button
                type="button"
                className="lb-phone-action"
                onClick={props.fullscreen.toggle}
                aria-pressed={props.fullscreen.active}
                aria-label={props.fullscreen.active ? 'Exit full screen' : 'Full screen'}
              >
                {props.fullscreen.active ? 'Exit' : 'Full'}
              </button>
            )}
          </div>
        </div>
      }
    >
      <Stage>
        <CsvGrid table={props.table} selected={props.selected} onSelect={props.onSelect} />
      </Stage>
    </PhoneShell>
  );
}
