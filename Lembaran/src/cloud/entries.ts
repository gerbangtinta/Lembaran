import { extensionOf } from '../files/pick';
import { shouldListPath, type FolderFile } from '../folders/entries';
import type { CloudEntry } from './types';

/**
 * A drive folder's children as the rows the hub already knows how to draw. A drive has no file handles, so the
 * rows carry a `cloud` reference instead: that is what reading and writing back go through.
 */
export function cloudFiles(entries: readonly CloudEntry[], driveId: string): FolderFile[] {
  return entries
    .filter((entry) => !entry.folder)
    .map((entry) => ({
      name: entry.name,
      path: entry.name,
      extension: extensionOf(entry.name),
      size: entry.size,
      modifiedAt: entry.modifiedAt,
      cloud: { provider: 'onedrive' as const, driveId, itemId: entry.id, etag: entry.etag, name: entry.name },
    }));
}

/** The folders of one level, in the order the drive returned them. */
export function cloudFolders(entries: readonly CloudEntry[]): CloudEntry[] {
  return entries.filter((entry) => entry.folder);
}

/**
 * What the hub is allowed to show: folders always, files only when a reader could open them — the same rule a
 * local folder follows, dot-files and Office lock files included.
 */
export function readableCloudEntries(
  entries: readonly CloudEntry[],
  extensions: readonly string[],
): CloudEntry[] {
  return entries.filter((entry) => entry.folder || shouldListPath(entry.name, extensions));
}
