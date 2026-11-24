import type { ThemePreference } from '@lembaran/framework';

/**
 * Two modes: pastel green (the light one, and the default) and dark. `light` was the warm cream theme
 * this app shipped first; a browser that remembered it is folded into pastel rather than left unknown.
 */
export const DEFAULT_THEME: ThemePreference = 'pastel';
export const THEME_ORDER: readonly ThemePreference[] = ['pastel', 'dark'];

export const THEME_LABELS: Record<ThemePreference, string> = {
  pastel: 'pastel green',
  light: 'pastel green',
  dark: 'dark',
};

export function isPreference(value: unknown): value is ThemePreference {
  return value === 'pastel' || value === 'light' || value === 'dark';
}

/** Folds the retired `light` theme into `pastel`, so a stored preference cannot select nothing. */
export function normalisePreference(value: ThemePreference): ThemePreference {
  return value === 'light' ? 'pastel' : value;
}

export function nextPreference(current: ThemePreference): ThemePreference {
  const theme = normalisePreference(current);
  const index = THEME_ORDER.indexOf(theme);
  return THEME_ORDER[(index + 1) % THEME_ORDER.length] ?? DEFAULT_THEME;
}
