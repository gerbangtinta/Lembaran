import { describe, expect, it } from 'vitest';
import { clampZoom, fitZoom, MAX_ZOOM, MIN_ZOOM, stepZoom, zoomLabel } from './zoom';

describe('zoom', () => {
  it('keeps a zoom inside the range it advertises', () => {
    expect(clampZoom(0.1)).toBe(MIN_ZOOM);
    expect(clampZoom(9)).toBe(MAX_ZOOM);
    expect(clampZoom(1.234)).toBe(1.23);
    expect(clampZoom(Number.NaN)).toBe(1);
  });

  it('fits a page to the window but never magnifies it', () => {
    expect(fitZoom(1000, 816)).toBe(1);
    expect(fitZoom(600, 816)).toBe(0.67);
    expect(fitZoom(0, 816)).toBe(1);
    expect(fitZoom(600, 0)).toBe(1);
  });

  it('steps by ten percent and stops at the ends', () => {
    expect(stepZoom(1, 1)).toBe(1.1);
    expect(stepZoom(1, -1)).toBe(0.9);
    expect(stepZoom(MAX_ZOOM, 1)).toBe(MAX_ZOOM);
    expect(stepZoom(MIN_ZOOM, -1)).toBe(MIN_ZOOM);
  });

  it('reads out as a percentage', () => {
    expect(zoomLabel(0.675)).toBe('68%');
  });
});
