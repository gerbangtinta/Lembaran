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

class LembaranDb extends Dexie {
  recent!: Table<RecentEntry, string>;

  constructor() {
    super('lembaran');
    this.version(1).stores({ recent: 'id, openedAt, name' });
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
