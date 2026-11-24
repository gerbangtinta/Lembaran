import { StatusBar, StatusHint, StatusName, StatusSeparator } from '@lembaran/ui';
import { zoomLabel } from '../../feature/view';
import type { CellSelection } from '../../feature/workbook';

interface Props {
  name: string;
  sheet: string;
  selection: CellSelection | null;
  zoom: number;
}

const MAX_TEXT = 48;

function cellText(selection: CellSelection): string {
  const text = selection.text.length > MAX_TEXT ? `${selection.text.slice(0, MAX_TEXT)}…` : selection.text;
  return text.length > 0 ? `${selection.a1}: ${text}` : selection.a1;
}

export function ExcelStatus({ name, sheet, selection, zoom }: Props) {
  return (
    <StatusBar>
      <StatusName title={name}>{name}</StatusName>
      <StatusSeparator />
      <span>{sheet}</span>
      {selection && (
        <>
          <StatusSeparator />
          <span title={selection.text}>{cellText(selection)}</span>
        </>
      )}
      <StatusSeparator />
      <span>{zoomLabel(zoom)}</span>
      <StatusHint>← → cells · Ctrl+F find · + − zoom · F full screen</StatusHint>
    </StatusBar>
  );
}
