import { sha256Hex } from '../files/hash';

const ROOT = 'lembaran';
const SOURCES = 'sources';

export interface Ingested {
  name: string;
  size: number;
  mime: string;
  hash: string;
  /** opfs://-style path, e.g. `lembaran/sources/<hash>.bin` */
  path: string;
}

export function opfsAvailable(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.storage?.getDirectory === 'function';
}

async function walk(segments: string[], create: boolean): Promise<FileSystemDirectoryHandle> {
  let current = await navigator.storage.getDirectory();
  for (const segment of segments) {
    current = await current.getDirectoryHandle(segment, { create });
  }
  return current;
}

async function fileHandle(path: string, create: boolean): Promise<FileSystemFileHandle> {
  const segments = path.split('/');
  const file = segments.pop();
  if (!file) throw new Error(`opfs path has no file segment: ${path}`);
  const dir = await walk(segments, create);
  return dir.getFileHandle(file, { create });
}

export function sourcePath(hash: string): string {
  return `${ROOT}/${SOURCES}/${hash}.bin`;
}

export async function putSource(hash: string, bytes: Uint8Array): Promise<string> {
  const path = sourcePath(hash);
  const handle = await fileHandle(path, true);
  const writable = await handle.createWritable();
  await writable.write(new Uint8Array(bytes));
  await writable.close();
  return path;
}

export async function hasSource(path: string): Promise<boolean> {
  try {
    await fileHandle(path, false);
    return true;
  } catch {
    return false;
  }
}

export async function readSource(path: string): Promise<Uint8Array> {
  const handle = await fileHandle(path, false);
  const file = await handle.getFile();
  return new Uint8Array(await file.arrayBuffer());
}

export async function removeSource(path: string): Promise<void> {
  const segments = path.split('/');
  const file = segments.pop();
  if (!file) return;
  try {
    const dir = await walk(segments, false);
    await dir.removeEntry(file);
  } catch {
    // already gone: a repeated Forget must not throw
  }
}

/**
 * Drops every copy Lembaran made for its readers. The originals — a folder on disk, a file in a drive — are not
 * touched by this and never were: these are the bytes this browser stored so a reload could not lose the document.
 */
export async function clearSources(): Promise<void> {
  try {
    const root = await navigator.storage.getDirectory();
    const folder = await root.getDirectoryHandle(ROOT);
    await folder.removeEntry(SOURCES, { recursive: true }).catch(() => undefined);
  } catch {
    // no OPFS, or nothing stored yet
  }
}

/**
 * Copies bytes into OPFS and describes them. Every reader opens from here, never
 * from a `File`, so a reload cannot lose the document.
 */
export async function ingest(bytes: Uint8Array, name: string, mime: string): Promise<Ingested> {
  const hash = await sha256Hex(bytes);
  const path = await putSource(hash, bytes);
  return { name, size: bytes.byteLength, mime, hash, path };
}

export async function ingestFile(file: File): Promise<Ingested> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return ingest(bytes, file.name, file.type || 'application/octet-stream');
}
