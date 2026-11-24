import { openLocalFile, type LocalFile } from '@lembaran/framework';

export const XLSX_EXTENSIONS = ['xlsx', 'xlsm'];
export const XLSX_MIMES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel.sheet.macroEnabled.12',
];

export function openFromDisk(): Promise<LocalFile | null> {
  return openLocalFile(XLSX_EXTENSIONS, XLSX_MIMES);
}
