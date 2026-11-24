import { BUILT_READERS } from './registry.generated';

export type ReaderId = string;

export interface ReaderEntry {
  id: ReaderId;
  /** project folder in this repo, Sanggar-style: `Lembaran.Pdf` */
  folder: string;
  /** deployed sub-path: `/pdf/` */
  slug: string;
  name: string;
  blurb: string;
  extensions: string[];
  mimeTypes: string[];
  available: boolean;
}

const ORDER = ['pdf', 'docx', 'pptx', 'xlsx', 'csv'];

/** Formats the plan still owes. They show as "coming next" until their folder exists. */
const PLANNED: ReaderEntry[] = [
  {
    id: 'docx',
    folder: 'Lembaran.Docs',
    slug: 'docs',
    name: 'Word',
    blurb: 'Paginated DOCX with real layout.',
    extensions: ['docx'],
    mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    available: false,
  },
  {
    id: 'pptx',
    folder: 'Lembaran.Pptx',
    slug: 'pptx',
    name: 'PowerPoint',
    blurb: 'Slides, thumbnails and notes.',
    extensions: ['pptx'],
    mimeTypes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    available: false,
  },
  {
    id: 'xlsx',
    folder: 'Lembaran.Excel',
    slug: 'xlsx',
    name: 'Excel',
    blurb: 'Sheet tabs, formulas evaluated, viewport painting.',
    extensions: ['xlsx'],
    mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    available: false,
  },
  {
    id: 'csv',
    folder: 'Lembaran.Csv',
    slug: 'csv',
    name: 'CSV',
    blurb: 'Streaming parse over a virtualized grid.',
    extensions: ['csv', 'tsv'],
    mimeTypes: ['text/csv', 'text/tab-separated-values'],
    available: false,
  },
];

function byPlanOrder(a: ReaderEntry, b: ReaderEntry): number {
  const left = ORDER.indexOf(a.id);
  const right = ORDER.indexOf(b.id);
  if (left !== -1 && right !== -1) return left - right;
  if (left !== -1) return -1;
  if (right !== -1) return 1;
  return a.id.localeCompare(b.id);
}

/**
 * Built readers first, then whatever the plan still owes. The built half is generated
 * from the projects on disk, so a new reader appears here by existing.
 */
export const READERS: readonly ReaderEntry[] = [
  ...BUILT_READERS.map((reader) => ({ ...reader, available: true })),
  ...PLANNED.filter((planned) => !BUILT_READERS.some((built) => built.id === planned.id)),
].sort(byPlanOrder);

export function readerById(id: ReaderId): ReaderEntry | undefined {
  return READERS.find((entry) => entry.id === id);
}

export function readerForExtension(extension: string): ReaderEntry | undefined {
  const wanted = extension.toLowerCase();
  return READERS.find((entry) => entry.extensions.includes(wanted));
}

export function readerForFileName(fileName: string): ReaderEntry | undefined {
  const dot = fileName.lastIndexOf('.');
  if (dot === -1) return undefined;
  return readerForExtension(fileName.slice(dot + 1));
}
