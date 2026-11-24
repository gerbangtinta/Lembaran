import {
  extensionOf,
  hasFileSystemAccess,
  ingest,
  pickFileFallback,
  pickFileHandle,
  readHandleBytes,
  remember,
} from '@lembaran/framework';
import type { ReaderEntry } from '../choose';

export interface Handoff {
  reader: ReaderEntry;
  /** OPFS path the reader should open */
  path: string;
  name: string;
}

/**
 * Copies a picked file into OPFS and hands the reader a path. The bytes never
 * cross the iframe boundary: both frames share the origin, so OPFS is the channel.
 */
export async function openForReader(reader: ReaderEntry): Promise<Handoff | null> {
  let name: string;
  let bytes: Uint8Array;
  let handle: FileSystemFileHandle | undefined;

  if (hasFileSystemAccess()) {
    const picked = await pickFileHandle(reader.extensions, reader.mimeTypes);
    if (!picked) return null;
    handle = picked;
    name = picked.name;
    bytes = await readHandleBytes(picked);
  } else {
    const file = await pickFileFallback(reader.extensions, reader.mimeTypes);
    if (!file) return null;
    name = file.name;
    bytes = new Uint8Array(await file.arrayBuffer());
  }

  const mime = reader.mimeTypes[0] ?? 'application/octet-stream';
  const ingested = await ingest(bytes, name, mime);
  await remember({
    id: ingested.hash,
    name,
    mime,
    size: ingested.size,
    path: ingested.path,
    handle,
    openedAt: Date.now(),
  });

  return { reader, path: ingested.path, name };
}

export async function handoffFromFile(file: File, reader: ReaderEntry): Promise<Handoff> {
  const mime = reader.mimeTypes[0] ?? file.type ?? 'application/octet-stream';
  const ingested = await ingest(new Uint8Array(await file.arrayBuffer()), file.name, mime);
  await remember({
    id: ingested.hash,
    name: file.name,
    mime,
    size: ingested.size,
    path: ingested.path,
    openedAt: Date.now(),
  });
  return { reader, path: ingested.path, name: file.name };
}

export function frameUrl(handoff: Handoff): string {
  const base = import.meta.env.DEV
    ? `/${handoff.reader.folder}/index.html`
    : `/${handoff.reader.slug}/`;
  const query = new URLSearchParams({ path: handoff.path, name: handoff.name });
  return `${base}?${query.toString()}`;
}

export function extensionOfFile(file: File): string {
  return extensionOf(file.name);
}
