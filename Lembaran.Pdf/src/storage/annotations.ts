import Dexie, { type Table } from 'dexie';

export type AnnotationColor = 'amber' | 'green' | 'blue' | 'rose';

/** A rectangle drawn over a page, plus the note attached to it. */
export interface Annotation {
  id: string;
  /** the document this belongs to: content hash when known, otherwise name+size */
  docKey: string;
  page: number;
  /** normalised to the page box, so zoom and width changes never move it */
  x: number;
  y: number;
  w: number;
  h: number;
  color: AnnotationColor;
  note: string;
  createdAt: number;
  /** true once the rectangle was written into the file itself: only the note is still ours to keep */
  baked?: boolean;
}

class AnnotationDb extends Dexie {
  items!: Table<Annotation, string>;

  constructor() {
    super('lembaran-annotations');
    this.version(1).stores({ items: 'id, docKey, page, createdAt' });
  }
}

const db = new AnnotationDb();

export async function listAnnotations(docKey: string): Promise<Annotation[]> {
  return db.items.where('docKey').equals(docKey).toArray();
}

export async function addAnnotation(annotation: Annotation): Promise<void> {
  await db.items.put(annotation);
}

export async function updateAnnotation(
  id: string,
  patch: Partial<Omit<Annotation, 'id' | 'docKey'>>,
): Promise<void> {
  await db.items.update(id, patch);
}

export async function removeAnnotation(id: string): Promise<void> {
  await db.items.delete(id);
}

/** Moves a document's notes to a new key, so a saved file keeps what the reader wrote about it. */
export async function rekeyAnnotations(from: string, to: string): Promise<void> {
  if (!from || !to || from === to) return;
  const rows = await db.items.where('docKey').equals(from).toArray();
  if (rows.length === 0) return;
  await db.transaction('rw', db.items, async () => {
    await db.items.bulkPut(rows.map((row) => ({ ...row, docKey: to, baked: true })));
    await db.items.bulkDelete(rows.map((row) => row.id));
  });
}

export async function clearAnnotations(docKey: string): Promise<void> {
  const ids = await db.items.where('docKey').equals(docKey).primaryKeys();
  await db.items.bulkDelete(ids);
}
