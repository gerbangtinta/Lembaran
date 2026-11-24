import {
  hasFileSystemAccess,
  ingest,
  pickFileFallback,
  pickFileHandle,
  readHandleBytes,
  remember,
} from '@lembaran/framework';

export const PDF_EXTENSIONS = ['pdf'];
export const PDF_MIMES = ['application/pdf'];

export interface OpenedLocal {
  name: string;
  bytes: Uint8Array;
  path: string;
}

/**
 * Opens a file from disk, copies it into OPFS, and records it. A cancelled picker
 * returns null rather than throwing: cancelling is not an error.
 */
export async function openFromDisk(): Promise<OpenedLocal | null> {
  let name: string;
  let bytes: Uint8Array;
  let handle: FileSystemFileHandle | undefined;

  if (hasFileSystemAccess()) {
    const picked = await pickFileHandle(PDF_EXTENSIONS, PDF_MIMES);
    if (!picked) return null;
    handle = picked;
    name = picked.name;
    bytes = await readHandleBytes(picked);
  } else {
    const file = await pickFileFallback(PDF_EXTENSIONS, PDF_MIMES);
    if (!file) return null;
    name = file.name;
    bytes = new Uint8Array(await file.arrayBuffer());
  }

  const ingested = await ingest(bytes, name, PDF_MIMES[0] ?? 'application/pdf');
  await remember({
    id: ingested.hash,
    name,
    mime: ingested.mime,
    size: ingested.size,
    path: ingested.path,
    handle,
    openedAt: Date.now(),
  });

  return { name, bytes, path: ingested.path };
}
