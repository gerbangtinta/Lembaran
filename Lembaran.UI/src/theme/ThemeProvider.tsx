import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ThemePreference } from '@lembaran/framework';
import { DEFAULT_THEME, isPreference } from './preference';

interface ThemeState {
  theme: ThemePreference;
  resolved: ThemePreference;
  setTheme(theme: ThemePreference): void;
}

const STORAGE_KEY = 'lembaran.theme';

const ThemeContext = createContext<ThemeState>({
  theme: DEFAULT_THEME,
  resolved: DEFAULT_THEME,
  setTheme: () => undefined,
});

/** The last choice, shared by every frame of the app; pastel when nothing was chosen yet. */
function readStored(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isPreference(stored)) return stored;
  } catch {
    // a disabled store is not a reason to fail: fall through to the default
  }
  return DEFAULT_THEME;
}

export function ThemeProvider({
  initial,
  children,
}: {
  initial?: ThemePreference;
  children: ReactNode;
}) {
  const [theme, setThemeState] = useState<ThemePreference>(initial ?? readStored);

  // a reader runs in its own iframe: one toggle should still change the whole app
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && isPreference(event.newValue)) setThemeState(event.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setTheme = useMemo(
    () => (next: ThemePreference) => {
      setThemeState(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // the preference will not survive a reload; this session still follows it
      }
    },
    [],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const value = useMemo<ThemeState>(() => ({ theme, resolved: theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  return useContext(ThemeContext);
}
