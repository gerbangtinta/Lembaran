import {
  cellAtPoint,
  cellRect,
  initWasm,
  openWorkbook,
  paintDisplayList,
  type DisplayList,
  type SheetInfo,
  type WorkbookHandle,
  type XlsxTextMatch,
} from '@betteroffice/xlsx';
// The package's `exports` map hides its own WASM, so it is imported by path: Vite serves it in
// development and emits a content-hashed same-origin asset in the build.
import wasmUrl from '../../../../node_modules/@betteroffice/xlsx/dist/generated/xlsx_wasm_bg.wasm?url';
import { cellAddress, columnName } from '../view';

let ready: Promise<void> | null = null;

/** One WASM instance per page load, however many sheets are painted. */
export function ensureWasm(): Promise<void> {
  ready ??= initWasm(wasmUrl);
  return ready;
}

/** Width of the row gutter and height of the column band, in CSS pixels. */
export const GRID_HEADER = 26;

/** Colours the chrome needs, read from the theme once per paint. */
export interface PaintTheme {
  accent: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textDim: string;
}

export interface SheetTab {
  /** the workbook's own sheet index, hidden sheets included */
  index: number;
  id: string;
  name: string;
  hidden: boolean;
}

export interface Workbook {
  handle: WorkbookHandle;
  /** every sheet in workbook order; the tab bar filters the hidden ones */
  sheets: SheetTab[];
  /** metadata of the active sheet (names, content extent, frozen panes, initial scroll) */
  info: SheetInfo;
}

export interface CellSelection {
  row: number;
  col: number;
  a1: string;
  text: string;
}

export interface PaintView {
  scrollX: number;
  scrollY: number;
  /** visible size in CSS pixels */
  width: number;
  height: number;
  zoom: number;
}

export interface PaintResult {
  frame: DisplayList;
}

export async function openXlsx(bytes: Uint8Array): Promise<Workbook> {
  await ensureWasm();
  const handle = openWorkbook(bytes);
  const catalog = handle.readCells({ ranges: [] });
  if (!catalog.ok) {
    handle.dispose();
    throw new Error('the workbook was refused by the engine');
  }
  const sheets: SheetTab[] = catalog.sheets.map((sheet, index) => ({
    index,
    id: sheet.sheetId,
    name: sheet.name,
    hidden: sheet.visibility === 'hidden' || sheet.visibility === 'veryHidden',
  }));
  return { handle, sheets, info: handle.sheetInfo() };
}

/** Activates a sheet in the engine and returns the workbook with the new active-sheet metadata. */
export function activateSheet(workbook: Workbook, index: number): Workbook {
  workbook.handle.setActiveSheet(index);
  return { ...workbook, info: workbook.handle.sheetInfo() };
}

export function disposeWorkbook(workbook: Workbook): void {
  workbook.handle.dispose();
}

/**
 * Paints the visible window of the active sheet with Excel's chrome: a column band across the top,
 * a row gutter down the left, then the display list. The list is built at `viewport / zoom` CSS
 * pixels and mapped onto the backing store at `dpr × zoom`, so zooming in shows fewer cells at a
 * larger scale instead of shrinking the sheet.
 */
export function paintSheet(
  workbook: Workbook,
  canvas: HTMLCanvasElement,
  view: PaintView,
  selection: CellSelection | null,
  theme: PaintTheme,
): PaintResult {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const scale = dpr * view.zoom;
  const sheetWidth = Math.max(1, Math.floor((view.width - GRID_HEADER) / view.zoom));
  const sheetHeight = Math.max(1, Math.floor((view.height - GRID_HEADER) / view.zoom));
  const frame = workbook.handle.displayList({
    x: Math.floor(view.scrollX),
    y: Math.floor(view.scrollY),
    width: sheetWidth,
    height: sheetHeight,
  });

  canvas.width = Math.max(1, Math.round(view.width * dpr));
  canvas.height = Math.max(1, Math.round(view.height * dpr));
  canvas.style.width = `${view.width}px`;
  canvas.style.height = `${view.height}px`;

  const context = canvas.getContext('2d');
  if (!context) throw new Error('this browser cannot paint the sheet: no 2d canvas context');
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);

  // the paper under the sheet, so an area past the used range is white rather than transparent
  context.fillStyle = theme.surface;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const origin = { x: GRID_HEADER * dpr, y: GRID_HEADER * dpr };
  paintDisplayList(context, frame, scale, origin);

  if (selection && frame.grid) {
    const rect = cellRect(frame.grid, selection.row, selection.col);
    if (rect) {
      context.save();
      context.beginPath();
      context.rect(origin.x, origin.y, (view.width - GRID_HEADER) * dpr, (view.height - GRID_HEADER) * dpr);
      context.clip();
      context.fillStyle = theme.accent;
      context.globalAlpha = 0.12;
      context.fillRect(origin.x + rect.x * scale, origin.y + rect.y * scale, rect.w * scale, rect.h * scale);
      context.globalAlpha = 1;
      context.strokeStyle = theme.accent;
      context.lineWidth = Math.max(1, Math.round(dpr));
      context.strokeRect(
        origin.x + rect.x * scale + 0.5,
        origin.y + rect.y * scale + 0.5,
        Math.max(0, rect.w * scale - 1),
        Math.max(0, rect.h * scale - 1),
      );
      context.restore();
    }
  }

  paintHeaders(context, frame, view, selection, theme, dpr);
  return { frame };
}

/** Excel's sticky chrome: letters across the top, numbers down the left, the selected pair tinted. */
function paintHeaders(
  context: CanvasRenderingContext2D,
  frame: DisplayList,
  view: PaintView,
  selection: CellSelection | null,
  theme: PaintTheme,
  dpr: number,
): void {
  const grid = frame.grid;

  context.save();
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.textBaseline = 'middle';

  // bands and the corner
  context.fillStyle = theme.surface2;
  context.fillRect(0, 0, view.width, GRID_HEADER);
  context.fillRect(0, 0, GRID_HEADER, view.height);
  context.fillStyle = theme.surface;
  context.fillRect(0, 0, GRID_HEADER, GRID_HEADER);

  context.strokeStyle = theme.border;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, GRID_HEADER - 0.5);
  context.lineTo(view.width, GRID_HEADER - 0.5);
  context.moveTo(GRID_HEADER - 0.5, 0);
  context.lineTo(GRID_HEADER - 0.5, view.height);
  context.stroke();

  if (grid) {
    const { zoom } = view;
    // the list may name its tracks; when it does not, they run from the first visible one
    const columns =
      grid.colIndices ??
      Array.from({ length: Math.max(0, grid.colOffsets.length - 1) }, (_, index) => grid.startCol + index);
    const rows =
      grid.rowIndices ??
      Array.from({ length: Math.max(0, grid.rowOffsets.length - 1) }, (_, index) => grid.startRow + index);

    context.save();
    context.beginPath();
    context.rect(GRID_HEADER, 0, view.width - GRID_HEADER, GRID_HEADER);
    context.clip();
    context.font = '11px system-ui, -apple-system, "Segoe UI", sans-serif';
    context.textAlign = 'center';
    for (let index = 0; index < columns.length; index += 1) {
      const col = columns[index];
      if (col === undefined) continue;
      const left = GRID_HEADER + (grid.colOffsets[index] ?? 0) * zoom;
      const right = GRID_HEADER + (grid.colOffsets[index + 1] ?? 0) * zoom;
      if (right < GRID_HEADER || left > view.width) continue;
      if (selection?.col === col) {
        context.fillStyle = theme.accent;
        context.globalAlpha = 0.14;
        context.fillRect(left, 0, right - left, GRID_HEADER - 1);
        context.globalAlpha = 1;
      }
      context.fillStyle = selection?.col === col ? theme.text : theme.textDim;
      context.fillText(columnName(col), (Math.max(left, GRID_HEADER) + Math.min(right, view.width)) / 2, GRID_HEADER / 2);
      if (right > GRID_HEADER && right < view.width) {
        context.strokeStyle = theme.border;
        context.beginPath();
        context.moveTo(Math.round(right) - 0.5, 4);
        context.lineTo(Math.round(right) - 0.5, GRID_HEADER - 4);
        context.stroke();
      }
    }
    context.restore();

    context.save();
    context.beginPath();
    context.rect(0, GRID_HEADER, GRID_HEADER, view.height - GRID_HEADER);
    context.clip();
    context.font = '11px system-ui, -apple-system, "Segoe UI", sans-serif';
    context.textAlign = 'center';
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (row === undefined) continue;
      const top = GRID_HEADER + (grid.rowOffsets[index] ?? 0) * zoom;
      const bottom = GRID_HEADER + (grid.rowOffsets[index + 1] ?? 0) * zoom;
      if (bottom < GRID_HEADER || top > view.height) continue;
      if (selection?.row === row) {
        context.fillStyle = theme.accent;
        context.globalAlpha = 0.14;
        context.fillRect(0, top, GRID_HEADER - 1, bottom - top);
        context.globalAlpha = 1;
      }
      context.fillStyle = selection?.row === row ? theme.text : theme.textDim;
      context.fillText(String(row + 1), GRID_HEADER / 2, (Math.max(top, GRID_HEADER) + Math.min(bottom, view.height)) / 2);
      if (bottom > GRID_HEADER && bottom < view.height) {
        context.strokeStyle = theme.border;
        context.beginPath();
        context.moveTo(4, Math.round(bottom) - 0.5);
        context.lineTo(GRID_HEADER - 4, Math.round(bottom) - 0.5);
        context.stroke();
      }
    }
    context.restore();
  }

  context.restore();
}

/** The cell under a viewport-local point, from the frame that is currently on screen. */
export function cellUnder(frame: DisplayList | null, x: number, y: number): { row: number; col: number } | null {
  if (!frame?.grid) return null;
  return cellAtPoint(frame.grid, x, y);
}

/** A selection plus the engine's formatted text for it, for the status line. */
export function readCell(workbook: Workbook, row: number, col: number): CellSelection {
  const a1 = cellAddress(row, col);
  const sheet = workbook.sheets[workbook.info.activeSheet];
  let text = '';
  if (sheet) {
    try {
      const read = workbook.handle.readCells({
        ranges: [{ sheetId: sheet.id, range: { kind: 'a1', a1 } }],
      });
      if (read.ok) text = read.ranges[0]?.cells[0]?.[0]?.displayText ?? '';
    } catch {
      // a selection outside the used range has nothing to read; the address still shows
    }
  }
  return { row, col, a1, text };
}

/** Formatted-text search across every sheet, in sheet and row order. */
export function searchWorkbook(workbook: Workbook, query: string): XlsxTextMatch[] {
  const text = query.trim();
  if (text.length === 0) return [];
  return workbook.handle.searchText(text, { limit: 200 });
}

/** Where a match sits in unzoomed sheet pixels, for scrolling it into view. */
export function matchPosition(workbook: Workbook, match: XlsxTextMatch): { x: number; y: number } {
  return workbook.handle.cellPosition(match.sheet, match.row, match.col);
}
