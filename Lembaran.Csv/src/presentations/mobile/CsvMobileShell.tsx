import { Icon, PhoneShell, Stage } from '@lembaran/ui';
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
 * The phone's CSV reader: the grid, a read-out of the selected cell, and three icons on the header line.
 * Desktop chrome (toolbar, status line, theme toggle) is not rendered here; it lives in `../layout/`.
 */
export function CsvMobileShell(props: CsvShellProps) {
  const rows = props.table.rows.length.toLocaleString();
  const columns = props.table.columns.toLocaleString();

  return (
    <PhoneShell
      rootRef={props.rootRef}
      title={props.name}
      actions={
        <>
          <button
            type="button"
            className="lb-phone-icon"
            onClick={props.onOpen}
            aria-label="Open a CSV file"
            title="Open a CSV file"
          >
            <Icon name="open" />
          </button>
          {/* the icon is the target; the native list behind it keeps the words */}
          <label className="lb-phone-icon csv-phone-sep" title="Separator">
            <Icon name="columns" />
            <select
              className="csv-phone-sep-input"
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
          </label>
        </>
      }
      end={
        props.fullscreen.supported && (
          <button
            type="button"
            className="lb-phone-icon"
            onClick={props.fullscreen.toggle}
            aria-pressed={props.fullscreen.active}
            aria-label={props.fullscreen.active ? 'Exit full screen' : 'Full screen'}
            title={props.fullscreen.active ? 'Exit full screen' : 'Full screen'}
          >
            <Icon name={props.fullscreen.active ? 'exitFullscreen' : 'fullscreen'} />
          </button>
        )
      }
      bar={
        <>
          <span className="csv-phone-cell" aria-live="polite" title={props.selected?.value}>
            {cellLabel(props)}
          </span>
          <span className="csv-phone-size">
            {rows} × {columns}
          </span>
        </>
      }
    >
      <Stage>
        <CsvGrid table={props.table} selected={props.selected} onSelect={props.onSelect} docKey={props.name} />
      </Stage>
    </PhoneShell>
  );
}