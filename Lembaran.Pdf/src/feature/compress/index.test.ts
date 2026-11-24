import { describe, expect, it, vi } from 'vitest';
import { TARGET_LADDER, fitToSize, type CompressStep } from './index';

const steps: CompressStep[] = [
  { quality: 0.85, maxEdge: 2400 },
  { quality: 0.72, maxEdge: 1800 },
  { quality: 0.55, maxEdge: 1200 },
];

describe('compressing to a target size', () => {
  it('stops at the first pass that fits, so the file keeps as much as the target allows', async () => {
    const sizes = [900, 600, 300];
    const run = vi.fn(async (step: CompressStep) => ({ bytes: new Uint8Array(sizes[steps.indexOf(step)] ?? 0) }));

    const fitted = await fitToSize(steps, 700, run);

    expect(fitted.met).toBe(true);
    expect(fitted.step).toEqual(steps[1]);
    expect(run).toHaveBeenCalledTimes(2);
    expect(fitted.outcome.bytes.byteLength).toBe(600);
  });

  it('returns the smallest pass it reached and says the target was missed', async () => {
    const sizes = [900, 600, 400];
    const run = async (step: CompressStep) => ({ bytes: new Uint8Array(sizes[steps.indexOf(step)] ?? 0) });

    const fitted = await fitToSize(steps, 100, run);

    expect(fitted.met).toBe(false);
    expect(fitted.step).toEqual(steps[2]);
    expect(fitted.outcome.bytes.byteLength).toBe(400);
  });

  it('walks a ladder that only ever gets stronger, or a fit would stop too late', () => {
    const edges = TARGET_LADDER.map((step) => step.maxEdge);
    expect(TARGET_LADDER.length).toBeGreaterThan(1);
    expect([...edges].sort((left, right) => right - left)).toEqual(edges);
  });
});
