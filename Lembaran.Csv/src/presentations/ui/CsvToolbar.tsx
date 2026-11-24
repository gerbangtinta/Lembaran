import { ThemeToggle, Toolbar, ToolbarSpacer, ToolButton, type FullscreenState } from '@lembaran/ui';
import { DELIMITERS } from '../../feature/grid';

export interface CsvToolbarProps {
  delimiter: string;
  onDelimiter(value: string): void;
  onOpen(): void;
  fullscreen: FullscreenState;
}

export function CsvToolbar({ delimiter, onDelimiter, onOpen, fullscreen }: CsvToolbarProps) {
  return (
    <Toolbar label="CSV controls">
      <ToolButton outline label="Open a CSV file" onClick={onOpen}>
        Open
      </ToolButton>

      <label className="csv-field">
        <span>Separator</span>
        <select value={delimiter} onChange={(event) => onDelimiter(event.target.value)}>
          {DELIMITERS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <ToolbarSpacer />
      <ThemeToggle />
      {fullscreen.supported && (
        <ToolButton
          outline
          label={fullscreen.active ? 'Exit full screen' : 'Full screen'}
          title="Full screen"
          pressed={fullscreen.active}
          onClick={fullscreen.toggle}
        >
          {fullscreen.active ? 'Exit full screen' : 'Full screen'}
        </ToolButton>
      )}
    </Toolbar>
  );
}
