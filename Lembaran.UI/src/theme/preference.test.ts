import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME, isPreference, nextPreference, THEME_ORDER } from './preference';

describe('theme preference', () => {
  it('starts on pastel and cycles pastel, light, dark, pastel', () => {
    expect(DEFAULT_THEME).toBe('pastel');
    const walked = [DEFAULT_THEME];
    for (let step = 0; step < THEME_ORDER.length; step += 1) {
      walked.push(nextPreference(walked[walked.length - 1]!));
    }
    expect(walked).toEqual(['pastel', 'light', 'dark', 'pastel']);
  });

  it('offers three modes and refuses anything else', () => {
    expect(THEME_ORDER).toEqual(['pastel', 'light', 'dark']);
    expect(isPreference('pastel')).toBe(true);
    expect(isPreference('dark')).toBe(true);
    expect(isPreference('system')).toBe(false);
    expect(isPreference(null)).toBe(false);
  });
});
