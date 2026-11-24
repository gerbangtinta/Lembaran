import { openLocalFile, type LocalFile } from '@lembaran/framework';

export const DOCX_EXTENSIONS = ['docx'];
export const DOCX_MIMES = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export function openFromDisk(): Promise<LocalFile | null> {
  return openLocalFile(DOCX_EXTENSIONS, DOCX_MIMES);
}
