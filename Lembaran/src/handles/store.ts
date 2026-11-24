import Dexie, { type Table } from 'dexie';
import type { CloudAccount, CloudFolderRef, CloudRef } from '../cloud/types';
import { clearSources, removeSource } from '../opfs/store';

export interface RecentEntry {
  /** content hash — the same file opened twice is one entry */
  id: string;
  name: string;
  mime: string;
  size: number;
  /** OPFS path holding the bytes this reader will actually read */
  path: string;
  /** Kept when the browser allows it, so the file can be re-opened from disk. */
  handle?: FileSystemFileHandle;
  /**
   * Set when the bytes came from a connected drive. It is what saving over the original needs, exactly like
   * `handle` is for a local file — the reader still reads an OPFS path and never sees this.
   */
  cloud?: CloudRef;
  openedAt: number;
}

/** The one folder the user bound, kept so the next session can list it again. */
export interface BoundFolder {
  /** always `'bound'`: the hub remembers one folder, not a tree of them */
  id: string;
  name: string;
  handle: FileSystemDirectoryHandle;
  boundAt: number;
}

/** The signed-in drive account, as the hub shows it. Tokens live in the OAuth client's own cache. */
export interface CloudSessionRow {
  id: 'current';
  account: CloudAccount;
  lastUsedAt: number;
}

/** The one folder bound inside a drive. */
export interface CloudFolderRow extends CloudFolderRef {
  id: 'bound';
  boundAt: number;
}

class LembaranDb extends Dexie {
  recent!: Table<RecentEntry, string>;
  folders!: Table<BoundFolder, string>;
  cloudSession!: Table<CloudSessionRow, string>;
  cloudFolder!: Table<CloudFolderRow, string>;

  constructor() {
    super('lembaran');
    this.version(1).stores({ recent: 'id, openedAt, name' });
    // v2: the bound folder lives beside the recents, so a reload can list it again
    this.version(2).stores({ recent: 'id, openedAt, name', folders: 'id, boundAt' });
    // v3: a connected drive — the account for the UI, and the one folder bound inside it
    this.version(3).stores({
      recent: 'id, openedAt, name',
      folders: 'id, boundAt',
      cloudSession: 'id',
      cloudFolder: 'id',
    });
  }
}

export const db = new LembaranDb();

export async function remember(entry: RecentEntry): Promise<void> {
  await db.recent.put(entry);
}

export async function listRecent(limit = 12): Promise<RecentEntry[]> {
  return db.recent.orderBy('openedAt').reverse().limit(limit).toArray();
}

/**
 * The record behind a reader's OPFS path. A reader opened by path asks this to find the disk handle the bytes
 * came from, which is the only way back to the file the user actually owns.
 */
export async function recentByPath(path: string): Promise<RecentEntry | null> {
  return (await db.recent.filter((entry) => entry.path === path).first()) ?? null;
}

export async function forget(id: string): Promise<void> {
  // the copy in OPFS exists only for this reader, so forgetting a document must reclaim it as well
  const row = await db.recent.get(id);
  await db.recent.delete(id);
  if (row?.path) await removeSource(row.path);
}

/** Forgetting every recent also reclaims every copy Lembaran stored; the originals are untouched. */
export async function clearRecent(): Promise<void> {
  await db.recent.clear();
  await clearSources();
}
