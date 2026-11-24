import { compressImages, type ImageReport } from './images';
import { rewriteStructure } from './structure';

export interface CompressOptions {
  /** drop what nothing references and pack the rest into object streams; text and vectors are untouched */
  structure: boolean;
  /** decode, shrink and re-encode the page images */
  images: boolean;
  /** 0.4–0.95, what the image pass aims at */
  quality: number;
  /** the longest edge, in pixels, an image may keep */
  maxEdge?: number;
}

export interface CompressOutcome {
  bytes: Uint8Array;
  images: ImageReport | null;
  before: number;
  after: number;
}

/** One pass of the image compressor: a quality, and the size the image may shrink to. */
export interface CompressStep {
  quality: number;
  maxEdge: number;
}

export type CompressLevel = 'low' | 'medium' | 'high';

/** The three presets. They are rungs of the ladder below, so a preset and "fit this size" agree on what is what. */
export const COMPRESS_PRESETS: Record<CompressLevel, { label: string; step: CompressStep }> = {
  low: { label: 'Low', step: { quality: 0.85, maxEdge: 2400 } },
  medium: { label: 'Medium', step: { quality: 0.72, maxEdge: 1800 } },
  high: { label: 'High', step: { quality: 0.55, maxEdge: 1200 } },
};

/** Strongest last: a target size is met by the first rung that fits, so the best-looking file that fits wins. */
export const TARGET_LADDER: readonly CompressStep[] = [
  COMPRESS_PRESETS.low.step,
  COMPRESS_PRESETS.medium.step,
  { quality: 0.6, maxEdge: 1500 },
  COMPRESS_PRESETS.high.step,
  { quality: 0.45, maxEdge: 1000 },
  { quality: 0.35, maxEdge: 800 },
];

/** The compression pass: one switch per kind of weight, never a rasterised page. */
export async function compress(bytes: Uint8Array, options: CompressOptions): Promise<CompressOutcome> {
  const before = bytes.byteLength;
  let current = bytes;
  let images: ImageReport | null = null;

  if (options.structure) current = await rewriteStructure(current);
  if (options.images) {
    const result = await compressImages(current, options.quality, options.maxEdge);
    current = result.bytes;
    images = result.images;
  }

  return { bytes: current, images, before, after: current.byteLength };
}

/**
 * Hits a target size by walking a ladder of passes and stopping at the first that fits. When none fits it returns
 * the smallest one it reached and says so — a document made mostly of text cannot be squeezed past the size its
 * own words need, and pretending otherwise would be a lie about the file.
 */
export async function fitToSize<T>(
  steps: readonly CompressStep[],
  targetBytes: number,
  run: (step: CompressStep) => Promise<{ bytes: Uint8Array } & T>,
): Promise<{ step: CompressStep; outcome: { bytes: Uint8Array } & T; met: boolean }> {
  let last: { step: CompressStep; outcome: { bytes: Uint8Array } & T } | null = null;
  for (const step of steps) {
    const outcome = await run(step);
    last = { step, outcome };
    if (outcome.bytes.byteLength <= targetBytes) return { ...last, met: true };
  }
  if (!last) throw new Error('There is no compression pass to run.');
  return { ...last, met: false };
}

export { compressImages, type ImageReport } from './images';
export { rewriteStructure } from './structure';
