import { useTheme } from '../theme/ThemeProvider';
import { nextPreference, THEME_LABELS } from './preference';

/** Toggles pastel green and dark. Reusable by any Lembaran front-end. */
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
      {theme === 'dark' ? <MoonIcon /> : <LeafIcon />}
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

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
    </svg>
  );
}
