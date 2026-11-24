import { PhoneShell, StageOverlay } from '@lembaran/ui';
import { GridCanvas } from '../layout/viewport/GridCanvas';
import type { WorkbookShellProps } from '../layout/WorkbookShell';
import { FindBar } from '../ui/FindBar';

/** Phone: one grid, sheet stepping in the bottom bar, find in a strip above the grid. */
export function ExcelMobileShell(props: WorkbookShellProps) {
  const sheetName = props.workbook
    ? (props.workbook.sheets[props.workbook.info.activeSheet]?.name ?? 'Sheet')
    : undefined;

  return (
    <PhoneShell
      rootRef={props.rootRef}
      title={props.name}
      meta={sheetName}
      bar={
        <>
          <button
            type="button"
            className="lb-phone-action"
            onClick={() => props.onStepSheet(-1)}
            disabled={!props.workbook}
            aria-label="Previous sheet"
          >
            ‹
          </button>
          <button
            type="button"
            className="lb-phone-action"
            onClick={props.onToggleFind}
            disabled={!props.workbook}
            aria-pressed={props.find.open}
            aria-label="Find in workbook"
          >
            Find
          </button>
          <button
            type="button"
            className="lb-phone-action"
            onClick={props.onOpen}
            aria-label="Open a spreadsheet"
          >
            Open
          </button>
          <button
            type="button"
            className="lb-phone-action"
            onClick={() => props.onStepSheet(1)}
            disabled={!props.workbook}
            aria-label="Next sheet"
          >
            ›
          </button>
        </>
      }
    >
      <div className="xl-book">
        {props.find.open && (
          <FindBar
            query={props.find.query}
            found={props.find.found}
            index={props.find.index}
            onQuery={props.onQuery}
            onStep={props.onFindStep}
            onClose={props.onCloseFind}
          />
        )}
        {props.workbook ? (
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
        ) : (
          <p className="xl-waiting">Opening the workbook…</p>
        )}
      </div>
      {(props.busy || props.error !== null) && (
        <StageOverlay tone={props.error ? 'error' : undefined}>
          {props.error ?? 'Reading the workbook…'}
        </StageOverlay>
      )}
    </PhoneShell>
  );
}
