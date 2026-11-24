import { describe, expect, it } from 'vitest';
import { seededRandom, valueNoise } from './noise';

describe('stamp noise', () => {
  it('draws the same numbers from the same seed, so an impression does not shimmer', () => {
    const first = seededRandom(42);
    const second = seededRandom(42);
    const values = [first(), first(), first()];
    expect(values).toEqual([second(), second(), second()]);
    expect(new Set(values).size).toBe(3);
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it('stays inside the unit range and varies smoothly rather than jumping', () => {
    const field = valueNoise(7, 4);
    const samples = [field.at(0.1, 0.1), field.at(0.5, 0.5), field.at(0.9, 0.2)];
    expect(samples.every((value) => value >= 0 && value <= 1)).toBe(true);
    // neighbours on a smooth field are close: this is what makes blotches instead of speckle
    const near = Math.abs(field.at(0.5, 0.5) - field.at(0.51, 0.51));
    expect(near).toBeLessThan(0.15);
  });

  it('gives a different field for a different seed', () => {
    expect(valueNoise(1, 6).at(0.3, 0.7)).not.toBeCloseTo(valueNoise(2, 6).at(0.3, 0.7), 5);
  });

  it('clamps points outside the square instead of reading past the grid', () => {
    const field = valueNoise(3, 3);
    expect(Number.isFinite(field.at(-1, 2))).toBe(true);
    expect(field.at(-1, 2)).toBeCloseTo(field.at(0, 1), 6);
    expect(field.at(5, 5)).toBeCloseTo(field.at(1, 1), 6);
  });
});
