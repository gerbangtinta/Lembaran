import { useTheme } from '../theme/ThemeProvider';
import { nextPreference, THEME_LABELS } from './preference';

/** Cycles pastel green → light → dark. Reusable by any Lembaran front-end. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = nextPreference(theme);

  return (
    <button
      type="button"
      className="lb-icon-button"
      onClick={() => setTheme(next)}
      title={`Theme: ${THEME_LABELS[theme]} — switch to ${THEME_LABELS[next]}`}
      aria-label={`Theme: ${THEME_LABELS[theme]}. Switch to ${THEME_LABELS[next]}`}
    >
      {theme === 'pastel' && <LeafIcon />}
      {theme === 'light' && <SunIcon />}
      {theme === 'dark' && <MoonIcon />}
    </button>
  );
}

function LeafIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 19c0-7.5 4.5-12 14-12 0 9.5-4.5 14-12 14H5Z" />
      <path d="M5 19c2-4 5-7 9-9" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
    </svg>
  );
}
