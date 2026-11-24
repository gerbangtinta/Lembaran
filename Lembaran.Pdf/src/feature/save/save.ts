import {
  ensureWritePermission,
  hasFileSystemAccess,
  ingest,
  readCloudFile,
  recentByPath,
  remember,
  saveBytesAs,
  statCloudItem,
  writeCloudFile,
  CloudError,
  type CloudRef,
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

/** The drive's copy is not the one this window opened: the user decides, nothing is overwritten silently. */
export class SaveConflictError extends SaveError {
  readonly cloud: CloudRef;

  constructor(cloud: CloudRef) {
    super('The copy in OneDrive changed since you opened it.');
    this.name = 'SaveConflictError';
    this.cloud = cloud;
  }
}

/** Whether this document can be written over: a drive document keeps its reference, a local one its handle. */
export async function canOverwrite(path: string): Promise<boolean> {
  if (!path) return false;
  const record = await recentByPath(path).catch(() => null);
  if (!record) return false;
  if (record.cloud) return true;
  return Boolean(record.handle) && hasFileSystemAccess();
}

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

  // a document that came out of a drive goes back into it, in place, at the version we opened
  if (input.overwrite && record?.cloud) {
    const cloud = record.cloud;
    try {
      const written = await writeCloudFile(cloud.driveId, cloud.itemId, output, cloud.etag);
      // the reader keeps reading from OPFS: re-ingest so the new bytes are what a reload opens
      const ingested = await ingest(output, input.target.name, input.target.mime);
      await remember({
        id: ingested.hash,
        name: input.target.name,
        mime: input.target.mime,
        size: ingested.size,
        path: ingested.path,
        cloud: { ...cloud, etag: written.etag },
        openedAt: Date.now(),
      });
      return { kind: 'file', path: ingested.path, size: output.byteLength, savedBytes: output };
    } catch (reason) {
      if (reason instanceof CloudError && reason.kind === 'conflict') throw new SaveConflictError(cloud);
      throw reason;
    }
  }

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

/**
 * Save over what is in the drive now, whatever version this window opened: the user has seen the conflict and
 * chosen to keep their copy. The fresh eTag is read first, so the write replaces a version it actually knows.
 */
export async function forceSaveToDrive(
  input: { bytes: Uint8Array; target: SaveTarget },
): Promise<SaveOutcome> {
  const record = await recentByPath(input.target.path).catch(() => null);
  const cloud = record?.cloud;
  if (!cloud) throw new SaveError('The drive reference for this document is gone.');
  const current = await statCloudItem(cloud.driveId, cloud.itemId);
  const written = await writeCloudFile(cloud.driveId, cloud.itemId, input.bytes, current.etag);
  const ingested = await ingest(input.bytes, input.target.name, input.target.mime);
  await remember({
    id: ingested.hash,
    name: input.target.name,
    mime: input.target.mime,
    size: ingested.size,
    path: ingested.path,
    cloud: { ...cloud, etag: written.etag },
    openedAt: Date.now(),
  });
  return { kind: 'file', path: ingested.path, size: input.bytes.byteLength, savedBytes: input.bytes };
}

/**
 * Take the drive's copy instead of this window's edits: fetch it, store it, and hand back where it now lives so
 * the caller can reopen. The caller is the one that throws the local record away.
 */
export async function reloadFromDrive(input: {
  path: string;
  name: string;
  mime: string;
}): Promise<{ path: string; bytes: Uint8Array; cloud: CloudRef | null }> {
  const record = await recentByPath(input.path).catch(() => null);
  const cloud = record?.cloud;
  if (!cloud) throw new SaveError('The drive reference for this document is gone.');
  const read = await readCloudFile(cloud.driveId, cloud.itemId);
  const ingested = await ingest(read.bytes, input.name, input.mime);
  await remember({
    id: ingested.hash,
    name: input.name,
    mime: input.mime,
    size: ingested.size,
    path: ingested.path,
    cloud: { ...cloud, etag: read.etag },
    openedAt: Date.now(),
  });
  return { path: ingested.path, bytes: read.bytes, cloud: { ...cloud, etag: read.etag } };
}
