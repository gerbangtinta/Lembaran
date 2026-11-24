import { openLocalFile, type LocalFile } from '@lembaran/framework';

export const CSV_EXTENSIONS = ['csv', 'tsv'];
export const CSV_MIMES = ['text/csv', 'text/tab-separated-values'];

export function openFromDisk(): Promise<LocalFile | null> {
  return openLocalFile(CSV_EXTENSIONS, CSV_MIMES);
}

/** CSV is text; the reader never guesses at an encoding beyond UTF-8. */
export function decodeText(bytes: Uint8Array): string {
  return new TextDecoder('utf-8').decode(bytes);
}
