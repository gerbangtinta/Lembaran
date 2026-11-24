import Dexie, { type Table } from 'dexie';

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

class LembaranDb extends Dexie {
  recent!: Table<RecentEntry, string>;
  folders!: Table<BoundFolder, string>;

  constructor() {
    super('lembaran');
    this.version(1).stores({ recent: 'id, openedAt, name' });
    // v2: the bound folder lives beside the recents, so a reload can list it again
    this.version(2).stores({ recent: 'id, openedAt, name', folders: 'id, boundAt' });
  }
}

export const db = new LembaranDb();

export async function remember(entry: RecentEntry): Promise<void> {
  await db.recent.put(entry);
}

export async function listRecent(limit = 12): Promise<RecentEntry[]> {
  return db.recent.orderBy('openedAt').reverse().limit(limit).toArray();
}

export async function forget(id: string): Promise<void> {
  await db.recent.delete(id);
}

export async function clearRecent(): Promise<void> {
  await db.recent.clear();
}
