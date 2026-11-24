import { ReaderShell, Stage, type FullscreenState } from '@lembaran/ui';
import type { RefObject } from 'react';
import type { CsvTable } from '../../feature/grid';
import { CsvGrid, type SelectedCell } from './viewport/CsvGrid';
import { CsvStatus } from '../ui/CsvStatus';
import { CsvToolbar } from '../ui/CsvToolbar';

export interface CsvShellProps {
  table: CsvTable;
  name: string;
  delimiter: string;
  selected: SelectedCell | null;
  fullscreen: FullscreenState;
  rootRef: RefObject<HTMLDivElement | null>;
  onSelect(cell: SelectedCell | null): void;
  onDelimiter(value: string): void;
  onOpen(): void;
}

/** The desktop CSV reader: the grid between a toolbar and a status line. The phone has its own shell. */
export function CsvShell(props: CsvShellProps) {
  return (
    <ReaderShell
      rootRef={props.rootRef}
      toolbar={
        <CsvToolbar
          delimiter={props.delimiter}
          onDelimiter={props.onDelimiter}
          onOpen={props.onOpen}
          fullscreen={props.fullscreen}
        />
      }
      footer={<CsvStatus table={props.table} selected={props.selected} name={props.name} />}
    >
      <Stage>
        <CsvGrid table={props.table} selected={props.selected} onSelect={props.onSelect} />
      </Stage>
    </ReaderShell>
  );
}
