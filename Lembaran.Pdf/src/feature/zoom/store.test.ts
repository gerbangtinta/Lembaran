import { describe, expect, it } from 'vitest';
import { clampZoom, fitZoom, formatZoom, nextZoom, previousZoom, ZOOM_MAX, ZOOM_MIN } from './store';

describe('zoom', () => {
  it('clamps to the supported range', () => {
    expect(clampZoom(0.01)).toBe(ZOOM_MIN);
    expect(clampZoom(99)).toBe(ZOOM_MAX);
    expect(clampZoom(Number.NaN)).toBe(1);
  });

  it('steps up and down without leaving the range', () => {
    expect(nextZoom(1)).toBe(1.25);
    expect(previousZoom(1)).toBe(0.8);
    expect(nextZoom(ZOOM_MAX)).toBe(ZOOM_MAX);
    expect(previousZoom(ZOOM_MIN)).toBe(ZOOM_MIN);
  });

  it('reads as a percentage', () => {
    expect(formatZoom(1)).toBe('100%');
    expect(formatZoom(0.666)).toBe('67%');
  });

  it('fits a page to the available width, never below the floor', () => {
    expect(fitZoom(500, 420)).toBeCloseTo(476 / 420, 5);
    expect(fitZoom(320, 420)).toBeCloseTo(296 / 420, 5);
    expect(fitZoom(120, 420)).toBe(ZOOM_MIN);
    expect(fitZoom(0, 420)).toBe(1);
    expect(fitZoom(500, 0)).toBe(1);
  });
});
