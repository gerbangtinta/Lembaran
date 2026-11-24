import {
  ensureWritePermission,
  hasFileSystemAccess,
  ingest,
  recentByPath,
  remember,
  saveBytesAs,
} from '@lembaran/framework';
import { bake, type BakeInput } from './bake';

export interface SaveTarget {
  /** the OPFS path the reader is looking at */
  path: string;
  name: string;
  mime: string;
}

export interface SaveOutcome {
  kind: 'file' | 'copy';
  /** the OPFS path the saved bytes now live at, when they were written over the original */
  path: string | null;
  size: number;
  savedBytes: Uint8Array;
}

export class SaveError extends Error {}

/**
 * The file as it would be if every edit had always been there: page order, turns, blanks, ink, text, pictures and
 * highlights written into the document itself. Nothing is compressed here beyond what the writer always does —
 * the structural and image passes belong to the Compress dialog, which is asked for on purpose.
 */
export async function bakePdf(input: BakeInput): Promise<Uint8Array> {
  const baked = await bake(input);
  return baked.bytes;
}

/**
 * Write finished bytes over the file the user opened, or to a copy when that is impossible.
 *
 * Overwriting needs the handle the document arrived with: it is looked up from the recents table by OPFS path.
 * Without one — a browser with no File System Access, or a file that was dropped — the same bytes go to a copy
 * through the save picker, and the caller is told which of the two happened.
 */
export async function writePdf(input: {
  bytes: Uint8Array;
  target: SaveTarget;
  /** false writes a copy through the save picker even when the original could be written */
  overwrite: boolean;
}): Promise<SaveOutcome> {
  const output = input.bytes;
  const record = await recentByPath(input.target.path).catch(() => null);
  const handle = record?.handle;

  if (input.overwrite && handle && hasFileSystemAccess()) {
    const allowed = await ensureWritePermission(handle).catch(() => false);
    if (allowed) {
      const writable = await handle.createWritable();
      await writable.write(new Uint8Array(output).buffer);
      await writable.close();

      // the reader keeps reading from OPFS: re-ingest so the new bytes are what a reload opens
      const ingested = await ingest(output, input.target.name, input.target.mime);
      await remember({
        id: ingested.hash,
        name: input.target.name,
        mime: input.target.mime,
        size: ingested.size,
        path: ingested.path,
        handle,
        openedAt: Date.now(),
      });
      return { kind: 'file', path: ingested.path, size: output.byteLength, savedBytes: output };
    }
  }

  const saved = await saveBytesAs(output, input.target.name, input.target.mime);
  if (!saved) throw new SaveError('The save was cancelled.');
  return { kind: 'copy', path: null, size: output.byteLength, savedBytes: output };
}

/** Whether this document can be written over at all: it needs the handle it was opened with, and a browser that writes. */
export async function canOverwrite(path: string): Promise<boolean> {
  if (!path || !hasFileSystemAccess()) return false;
  const record = await recentByPath(path).catch(() => null);
  return Boolean(record?.handle);
}
