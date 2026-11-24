import type { RefObject } from 'react';
import { ReaderShell, StageOverlay, type FullscreenState } from '@lembaran/ui';
import type { CellSelection, Workbook } from '../../feature/workbook';
import type { ScrollPoint } from '../../feature/view';
import { SheetTabs } from '../component/SheetTabs';
import { ExcelStatus } from '../ui/ExcelStatus';
import { ExcelToolbar } from '../ui/ExcelToolbar';
import { FindBar } from '../ui/FindBar';
import { GridCanvas } from './viewport/GridCanvas';

export interface FindState {
  open: boolean;
  query: string;
  found: number;
  index: number;
}

export interface WorkbookShellProps {
  name: string;
  workbook: Workbook | null;
  zoom: number;
  scroll: ScrollPoint;
  viewport: { width: number; height: number };
  selection: CellSelection | null;
  busy: boolean;
  error: string | null;
  fullscreen: FullscreenState;
  rootRef: RefObject<HTMLDivElement | null>;
  find: FindState;
  onOpen(): void;
  onZoomIn(): void;
  onZoomOut(): void;
  onResetZoom(): void;
  onToggleFind(): void;
  onQuery(value: string): void;
  onFindStep(direction: 1 | -1): void;
  onCloseFind(): void;
  onScroll(scroll: ScrollPoint): void;
  onViewport(width: number, height: number): void;
  onSelect(row: number, col: number): void;
  onSheet(index: number): void;
  onStepSheet(delta: number): void;
  onPaintError(message: string): void;
}

/** The desktop workbook: toolbar, optional find strip, the painted grid, sheet tabs, status line. */
export function WorkbookShell(props: WorkbookShellProps) {
  const sheetName = props.workbook
    ? (props.workbook.sheets[props.workbook.info.activeSheet]?.name ?? 'Sheet')
    : 'Workbook';

  return (
    <ReaderShell
      rootRef={props.rootRef}
      toolbar={
        <ExcelToolbar
          zoom={props.zoom}
          busy={props.busy}
          findOpen={props.find.open}
          fullscreen={props.fullscreen}
          onOpen={props.onOpen}
          onZoomIn={props.onZoomIn}
          onZoomOut={props.onZoomOut}
          onResetZoom={props.onResetZoom}
          onToggleFind={props.onToggleFind}
        />
      }
      banner={
        props.find.open && (
          <FindBar
            query={props.find.query}
            found={props.find.found}
            index={props.find.index}
            onQuery={props.onQuery}
            onStep={props.onFindStep}
            onClose={props.onCloseFind}
          />
        )
      }
      footer={
        <ExcelStatus
          name={props.name}
          sheet={sheetName}
          selection={props.selection}
          zoom={props.zoom}
        />
      }
    >
      <div className="xl-book">
        {props.workbook ? (
          <>
            <GridCanvas
              workbook={props.workbook}
              zoom={props.zoom}
              scroll={props.scroll}
              selection={props.selection}
              onScroll={props.onScroll}
              onSelect={props.onSelect}
              onViewport={props.onViewport}
              onPaintError={props.onPaintError}
            />
            <SheetTabs
              sheets={props.workbook.sheets}
              active={props.workbook.info.activeSheet}
              onSelect={props.onSheet}
            />
          </>
        ) : (
          <p className="xl-waiting">Opening the workbook…</p>
        )}
      </div>
      {(props.busy || props.error !== null) && (
        <StageOverlay tone={props.error ? 'error' : undefined}>
          {props.error ?? 'Reading the workbook…'}
        </StageOverlay>
      )}
    </ReaderShell>
  );
}
