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

export async function clearAnnotations(docKey: string): Promise<void> {
  const ids = await db.items.where('docKey').equals(docKey).primaryKeys();
  await db.items.bulkDelete(ids);
}
