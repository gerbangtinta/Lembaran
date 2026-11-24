import {
  hasFileSystemAccess,
  pickFileFallback,
  pickFileHandle,
  readHandleBytes,
} from './pick';
import { ingest as ingestBytes } from '../opfs/store';
import { remember } from '../handles/store';

export interface LocalFile {
  name: string;
  mime: string;
  bytes: Uint8Array;
  /** OPFS path holding the bytes */
  path: string;
  hash: string;
}

/**
 * Pick a file, copy it into OPFS, and record it. Returns null when the user cancels.
 * The fallback path (`<input type=file>`) is used wherever the File System Access API
 * is missing, so every reader has one implementation of opening a local file.
 */
export async function openLocalFile(
  extensions: string[],
  mimeTypes: string[],
): Promise<LocalFile | null> {
  const mime = mimeTypes[0] ?? 'application/octet-stream';
  let name: string;
  let bytes: Uint8Array;
  let handle: FileSystemFileHandle | undefined;

  if (hasFileSystemAccess()) {
    const picked = await pickFileHandle(extensions, mimeTypes);
    if (!picked) return null;
    handle = picked;
    name = picked.name;
    bytes = await readHandleBytes(picked);
  } else {
    const file = await pickFileFallback(extensions, mimeTypes);
    if (!file) return null;
    name = file.name;
    bytes = new Uint8Array(await file.arrayBuffer());
  }

  const ingested = await ingestBytes(bytes, name, mime);
  await remember({
    id: ingested.hash,
    name,
    mime,
    size: ingested.size,
    path: ingested.path,
    ...(handle ? { handle } : {}),
    openedAt: Date.now(),
  });

  return { name, mime, bytes, path: ingested.path, hash: ingested.hash };
}
