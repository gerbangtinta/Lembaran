import { openLocalFile, type LocalFile } from '@lembaran/framework';

export const PPTX_EXTENSIONS = ['pptx'];
export const PPTX_MIMES = ['application/vnd.openxmlformats-officedocument.presentationml.presentation'];

export function openFromDisk(): Promise<LocalFile | null> {
  return openLocalFile(PPTX_EXTENSIONS, PPTX_MIMES);
}
