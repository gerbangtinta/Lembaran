import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THEME,
  isPreference,
  nextPreference,
  normalisePreference,
  THEME_ORDER,
} from './preference';

describe('theme preference', () => {
  it('starts on pastel and toggles between pastel and dark', () => {
    expect(DEFAULT_THEME).toBe('pastel');
    const walked = [DEFAULT_THEME];
    for (let step = 0; step < THEME_ORDER.length; step += 1) {
      walked.push(nextPreference(walked[walked.length - 1]!));
    }
    expect(walked).toEqual(['pastel', 'dark', 'pastel']);
  });

  it('folds the retired light theme into pastel instead of losing the preference', () => {
    expect(normalisePreference('light')).toBe('pastel');
    expect(nextPreference('light')).toBe('dark');
    expect(normalisePreference('dark')).toBe('dark');
  });

  it('accepts the stored ids and refuses anything else', () => {
    expect(THEME_ORDER).toEqual(['pastel', 'dark']);
    expect(isPreference('pastel')).toBe(true);
    expect(isPreference('light')).toBe(true);
    expect(isPreference('dark')).toBe(true);
    expect(isPreference('system')).toBe(false);
    expect(isPreference(null)).toBe(false);
  });
});
