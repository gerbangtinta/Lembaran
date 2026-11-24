import type { SheetTab } from '../../feature/workbook';

interface Props {
  sheets: readonly SheetTab[];
  active: number;
  onSelect(index: number): void;
}

/** The workbook's sheets as tabs, workbook order, hidden sheets left out. */
export function SheetTabs({ sheets, active, onSelect }: Props) {
  return (
    <nav className="xl-tabs" aria-label="Sheets">
      {sheets
        .filter((sheet) => !sheet.hidden)
        .map((sheet) => (
          <button
            key={sheet.index}
            type="button"
            className="xl-tab"
            aria-current={sheet.index === active}
            title={sheet.name}
            onClick={() => onSelect(sheet.index)}
          >
            {sheet.name}
          </button>
        ))}
    </nav>
  );
}
