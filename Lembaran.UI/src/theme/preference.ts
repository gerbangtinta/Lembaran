import type { ThemePreference } from '@lembaran/framework';

/** Three modes only: pastel green is the Lembaran default. */
export const DEFAULT_THEME: ThemePreference = 'pastel';
export const THEME_ORDER: readonly ThemePreference[] = ['pastel', 'light', 'dark'];

export const THEME_LABELS: Record<ThemePreference, string> = {
  pastel: 'pastel green',
  light: 'light',
  dark: 'dark',
};

export function isPreference(value: unknown): value is ThemePreference {
  return value === 'pastel' || value === 'light' || value === 'dark';
}

export function nextPreference(current: ThemePreference): ThemePreference {
  const index = THEME_ORDER.indexOf(current);
  return THEME_ORDER[(index + 1) % THEME_ORDER.length] ?? DEFAULT_THEME;
}
