import Dexie, { type Table } from 'dexie';

export type Rotation = 0 | 90 | 180 | 270;

/** A page that exists only in the edit record: it has a size in points and a place in the running order. */
export interface BlankPage {
  id: string;
  /** how many source pages come before it, so a deletion elsewhere keeps it where it was */
  at: number;
  width: number;
  height: number;
}

/** The page sequence as the reader shows it, separate from the bytes on disk. */
export interface PagePlan {
  /** 1-based source pages, in display order; a deleted page is simply absent */
  order: number[];
  /** cumulative rotation per source page */
  rotation: Record<number, Rotation>;
  blanks: BlankPage[];
}

export type EditItemKind = 'text' | 'image' | 'ink' | 'highlight';

export interface TextItem {
  id: string;
  kind: 'text';
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  size: number;
  color: string;
  align: 'left' | 'center' | 'right';
  /** the run this replaced, when the text box came from editing existing text */
  replaced?: string;
  /** a text box can sit on its own white patch, so the page under it does not show through */
  background?: 'white' | 'none';
}

export interface ImageItem {
  id: string;
  kind: 'image';
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  blobId: string;
  mime: 'image/png' | 'image/jpeg';
  /** a signature or a stamp is still a picture; the role only changes what the reader calls it */
  role?: 'image' | 'signature' | 'stamp';
}

export interface InkItem {
  id: string;
  kind: 'ink';
  page: number;
  /** normalised points, 0–1 of the page box */
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
}

export interface HighlightItem {
  id: string;
  kind: 'highlight';
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

export type EditItem = TextItem | ImageItem | InkItem | HighlightItem;

/** One item before the store gives it an id ? distribution over the union, which plain `Omit` loses. */
type NewItem<T> = T extends { id: string } ? Omit<T, 'id'> : never;
export type NewEditItem = NewItem<EditItem>;

/** Everything the reader will replay into the file when the user saves. */
export interface PdfEdits {
  docKey: string;
  plan: PagePlan;
  items: EditItem[];
  updatedAt: number;
}

export interface EditBlob {
  id: string;
  mime: string;
  bytes: Blob;
}

/** What a reusable picture is for: a signature to sign with, or a stamp to mark with. */
export type PresetKind = 'signature' | 'stamp';

/** One line of a composed stamp: the words, and how they sit against the rest. */
export interface StampLine {
  id: string;
  text: string;
  bold: boolean;
  /** relative to the design's base size */
  size: 'sm' | 'md' | 'lg';
}

/** How a stamp is drawn. Kept with the preset so a stamp can be reopened and changed, not just re-stamped. */
export interface StampDesign {
  style: 'paper' | 'digital' | 'plain';
  /** ink colour of the paper style; the digital style uses its own near-black */
  colour: string;
  /** base text size in points */
  size: 'sm' | 'md' | 'lg';
  uppercase: boolean;
  border: 'double' | 'single' | 'none';
  align: 'center' | 'left';
  /** how clean the impression is: a machine print, a hand press, or a worn rubber stamp */
  finish?: 'perfect' | 'natural' | 'worn';
  /** the seed the hand-made marks are drawn from, so a design looks the same every time it is previewed */
  seed?: number;
  lines: StampLine[];
}

/** A signature or a stamp kept between documents: draw or upload it once, pick it again next time. */
export interface SignaturePreset {
  id: string;
  kind: PresetKind;
  label: string;
  blobId: string;
  mime: 'image/png' | 'image/jpeg';
  /** width ÷ height of the picture, so placing it keeps its shape */
  aspect: number;
  /** a stamp keeps its settings; a signature is only its picture */
  design?: StampDesign;
  createdAt: number;
}

class EditDb extends Dexie {
  edits!: Table<PdfEdits, string>;
  blobs!: Table<EditBlob, string>;
  presets!: Table<SignaturePreset, string>;

  constructor() {
    super('lembaran-pdf-edits');
    this.version(1).stores({ edits: 'docKey, updatedAt', blobs: 'id' });
    // v2 keeps the signatures and stamps themselves, not just the ones a document uses
    this.version(2).stores({ edits: 'docKey, updatedAt', blobs: 'id', presets: 'id, kind, createdAt' });
  }
}

export const editDb = new EditDb();

export async function loadEdits(docKey: string): Promise<PdfEdits | null> {
  if (!docKey) return null;
  const row = await editDb.edits.get(docKey);
  return row ?? null;
}

export async function saveEdits(edits: PdfEdits): Promise<void> {
  await editDb.edits.put(edits);
}

export async function dropEdits(docKey: string): Promise<void> {
  await editDb.edits.delete(docKey);
}

export async function putBlob(id: string, bytes: Blob, mime: string): Promise<void> {
  await editDb.blobs.put({ id, bytes, mime });
}

export async function readBlob(id: string): Promise<Blob | null> {
  const row = await editDb.blobs.get(id);
  return row?.bytes ?? null;
}

export async function dropBlob(id: string): Promise<void> {
  await editDb.blobs.delete(id);
}

export interface NewPreset {
  kind: PresetKind;
  label: string;
  blob: Blob;
  mime: 'image/png' | 'image/jpeg';
  aspect: number;
  design?: StampDesign;
  /** update this preset instead of making a new one */
  id?: string;
}

/** The saved signatures or stamps of one kind, oldest first — the order they are offered in. */
export async function listPresets(kind: PresetKind): Promise<SignaturePreset[]> {
  const rows = await editDb.presets.where('kind').equals(kind).toArray();
  return rows.sort((left, right) => left.createdAt - right.createdAt);
}

export async function savePreset(input: NewPreset): Promise<SignaturePreset> {
  const existing = input.id ? await editDb.presets.get(input.id) : undefined;
  const id = existing?.id ?? `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const blobId = existing?.blobId ?? `b${id}`;
  await putBlob(blobId, input.blob, input.mime);
  const row: SignaturePreset = {
    id,
    kind: input.kind,
    label: input.label,
    blobId,
    mime: input.mime,
    aspect: input.aspect,
    design: input.design ?? existing?.design,
    createdAt: existing?.createdAt ?? Date.now(),
  };
  await editDb.presets.put(row);
  return row;
}

export async function deletePreset(id: string): Promise<void> {
  const row = await editDb.presets.get(id);
  if (!row) return;
  await editDb.transaction('rw', editDb.presets, editDb.blobs, async () => {
    await editDb.blobs.delete(row.blobId);
    await editDb.presets.delete(id);
  });
}

/** Moves a document's edits to a new key — used when a save changes the content hash. */
export async function rekeyEdits(from: string, to: string): Promise<void> {
  if (!from || !to || from === to) return;
  const row = await editDb.edits.get(from);
  if (!row) return;
  await editDb.transaction('rw', editDb.edits, async () => {
    await editDb.edits.put({ ...row, docKey: to, updatedAt: Date.now() });
    await editDb.edits.delete(from);
  });
}
