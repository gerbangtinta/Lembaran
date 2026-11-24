/**
 * The hand-made part of a stamp: a press that is not a printer leaves uneven ink. Both functions are seeded,
 * so the same seed always draws the same grain — a preview does not shimmer while it is being typed.
 */

/** Deterministic pseudo-random numbers in [0, 1), from a small integer seed (mulberry32). */
export function seededRandom(seed: number): () => number {
  let state = (Math.floor(seed) || 1) | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface NoiseField {
  /** a value in [0, 1) at a point of the unit square; smooth, so it makes blotches rather than speckle */
  at(x: number, y: number): number;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * Value noise: a `cells × cells` grid of random numbers read with a smoothstep in both directions. It is not
 * Perlin's gradient noise, but it is the same idea — smooth blotches, cheap enough to run over a whole stamp.
 */
export function valueNoise(seed: number, cells = 8): NoiseField {
  const random = seededRandom(seed);
  const size = Math.max(1, Math.floor(cells));
  const grid = new Float32Array(size * size);
  for (let index = 0; index < grid.length; index += 1) grid[index] = random();
  const read = (x: number, y: number) => grid[(y % size) * size + (x % size)] ?? 0;

  return {
    at(x: number, y: number) {
      const fx = Math.min(0.999999, Math.max(0, x)) * size;
      const fy = Math.min(0.999999, Math.max(0, y)) * size;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = smooth(fx - x0);
      const ty = smooth(fy - y0);
      const top = read(x0, y0) * (1 - tx) + read(x0 + 1, y0) * tx;
      const bottom = read(x0, y0 + 1) * (1 - tx) + read(x0 + 1, y0 + 1) * tx;
      return top * (1 - ty) + bottom * ty;
    },
  };
}
