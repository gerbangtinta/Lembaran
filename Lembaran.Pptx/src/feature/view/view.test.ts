import { describe, expect, it } from 'vitest';
import { clampScale, fitScale, MAX_SCALE, MIN_SCALE, scaleLabel, slideLabel, stepScale, stepSlide } from './view';

describe('slide view', () => {
  it('fits a 16:9 slide into a window without magnifying it', () => {
    expect(fitScale(1280, 720, 1280, 720)).toBe(0.93);
    expect(fitScale(640, 720, 1280, 720)).toBe(0.46);
    expect(fitScale(2000, 1200, 1280, 720)).toBe(1);
    expect(fitScale(0, 720, 1280, 720)).toBe(1);
  });

  it('keeps a scale inside the range it advertises', () => {
    expect(clampScale(0.01)).toBe(MIN_SCALE);
    expect(clampScale(9)).toBe(MAX_SCALE);
    expect(clampScale(1.234)).toBe(1.23);
    expect(clampScale(Number.NaN)).toBe(1);
  });

  it('steps by ten percent and stops at the ends', () => {
    expect(stepScale(1, 1)).toBe(1.1);
    expect(stepScale(MIN_SCALE, -1)).toBe(MIN_SCALE);
    expect(stepScale(MAX_SCALE, 1)).toBe(MAX_SCALE);
  });

  it('never walks off the deck', () => {
    expect(stepSlide(0, 3, -1)).toBe(0);
    expect(stepSlide(2, 3, 1)).toBe(2);
    expect(stepSlide(0, 0, 1)).toBe(0);
    expect(slideLabel(0, 3)).toBe('1 / 3');
    expect(slideLabel(0, 0)).toBe('0 / 0');
    expect(scaleLabel(0.465)).toBe('47%');
  });
});
