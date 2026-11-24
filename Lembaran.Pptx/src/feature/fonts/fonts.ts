/**
 * The font bytes that let a deck keep its own metrics. PowerPoint runs its layout in WASM and never
 * sees CSS, so the substitutes are registered under the document's family names directly.
 *
 * Only the families a deck actually names are fetched: the full substitute set is over 8 MB, far
 * too much to pull for a deck that only uses Arial. Every fetch is best-effort: a missing or failed
 * face is skipped, and the engine falls back to its own face instead of failing the deck.
 */

interface FaceFile {
  file: string;
  bold?: boolean;
  italic?: boolean;
}

const FILES: Record<string, FaceFile[]> = {
  Carlito: [
    { file: 'Carlito-Regular.ttf' },
    { file: 'Carlito-Bold.ttf', bold: true },
    { file: 'Carlito-Italic.ttf', italic: true },
    { file: 'Carlito-BoldItalic.ttf', bold: true, italic: true },
  ],
  LiberationSans: [
    { file: 'LiberationSans-Regular.ttf' },
    { file: 'LiberationSans-Bold.ttf', bold: true },
    { file: 'LiberationSans-Italic.ttf', italic: true },
    { file: 'LiberationSans-BoldItalic.ttf', bold: true, italic: true },
  ],
  LiberationSerif: [
    { file: 'LiberationSerif-Regular.ttf' },
    { file: 'LiberationSerif-Bold.ttf', bold: true },
    { file: 'LiberationSerif-Italic.ttf', italic: true },
    { file: 'LiberationSerif-BoldItalic.ttf', bold: true, italic: true },
  ],
  DejaVuSans: [
    { file: 'DejaVuSans.ttf' },
    { file: 'DejaVuSans-Bold.ttf', bold: true },
    { file: 'DejaVuSans-Oblique.ttf', italic: true },
    { file: 'DejaVuSans-BoldOblique.ttf', bold: true, italic: true },
  ],
};

/** document families → bundled face, per the manifest in `public/fonts`. */
const ALIASES: Record<string, keyof typeof FILES> = {
  Calibri: 'Carlito',
  Arial: 'LiberationSans',
  Helvetica: 'LiberationSans',
  'Times New Roman': 'LiberationSerif',
  Times: 'LiberationSerif',
  Verdana: 'DejaVuSans',
};

const BY_FOLDED_NAME = new Map(
  Object.entries(ALIASES).map(([name, bundled]) => [name.toLowerCase(), bundled] as const),
);

const BASE = '/fonts/';

export interface EngineFace {
  family: string;
  bold?: boolean;
  italic?: boolean;
  bytes: Uint8Array;
}

/** file name → bytes, shared by every deck opened on this page. `null` marks a failed fetch. */
const downloads = new Map<string, Promise<Uint8Array | null>>();

function bytesOf(file: string): Promise<Uint8Array | null> {
  let pending = downloads.get(file);
  if (!pending) {
    pending = fetch(`${BASE}${file}`)
      .then(async (response) => (response.ok ? new Uint8Array(await response.arrayBuffer()) : null))
      .catch(() => null);
    downloads.set(file, pending);
  }
  return pending;
}

/**
 * Faces for the families a deck names. Unknown families, theme references (`+mn-lt`) and failures
 * are dropped: the engine then draws those runs with its own face, which is the best we can offer.
 *
 * Never rejects.
 */
export async function standardFonts(families: Iterable<string>): Promise<EngineFace[]> {
  const wanted = new Map<string, keyof typeof FILES>();
  for (const family of families) {
    const bundled = BY_FOLDED_NAME.get(family.trim().toLowerCase());
    if (!bundled || wanted.has(family)) continue;
    wanted.set(family, bundled);
  }
  if (wanted.size === 0) return [];

  const faces: EngineFace[] = [];
  await Promise.all(
    [...wanted].map(async ([family, bundled]) => {
      const downloaded = await Promise.all(
        (FILES[bundled] ?? []).map(async (face) => ({ face, bytes: await bytesOf(face.file) })),
      );
      for (const { face, bytes } of downloaded) {
        if (bytes) faces.push({ family, bold: face.bold, italic: face.italic, bytes });
      }
    }),
  );
  return faces;
}
