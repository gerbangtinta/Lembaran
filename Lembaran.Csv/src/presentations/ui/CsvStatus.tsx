import { StatusBar, StatusHint, StatusName, StatusSeparator, StatusWarn } from '@lembaran/ui';
import { columnName, type CsvTable } from '../../feature/grid';
import type { SelectedCell } from '../layout/viewport/CsvGrid';

interface Props {
  table: CsvTable;
  selected: SelectedCell | null;
  name: string;
}

export function CsvStatus({ table, selected, name }: Props) {
  return (
    <StatusBar>
      <StatusName title={name}>{name}</StatusName>
      <StatusSeparator />
      <span>
        {table.rows.length.toLocaleString()} rows × {table.columns.toLocaleString()} columns
      </span>
      <StatusSeparator />
      <span>“{table.delimiter === '\t' ? 'tab' : table.delimiter}”</span>
      {selected && (
        <>
          <StatusSeparator />
          <span>
            {columnName(selected.col)}
            {selected.row + 1}
            {selected.value.length > 0 ? `: ${selected.value.slice(0, 60)}` : ''}
          </span>
        </>
      )}
      {table.problems.length > 0 && (
        <>
          <StatusSeparator />
          <StatusWarn>{table.problems[0]}</StatusWarn>
        </>
      )}
      <StatusHint>click a cell to read it</StatusHint>
    </StatusBar>
  );
}
