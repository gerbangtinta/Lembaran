import { useCallback, useEffect, useRef, useState } from 'react';

/** Namespaced so another app on the same origin cannot mistake our entry for its own. */
const KEY = 'lbFolder';

/**
 * The folder area's own history. Stepping into a folder, or back out of one, pushes a history entry
 * carrying the path, so the mouse's back and forward buttons (and Alt+Left/Right) walk the folder tree
 * instead of leaving the hub. Mounted only while the folder panel is on screen, so a reader keeps the
 * browser's normal history.
 */
export function useFolderPath(resetKey: string): {
  path: string;
  navigate(next: string): void;
} {
  const [path, setPath] = useState('');
  const current = useRef('');

  const go = useCallback((next: string) => {
    current.current = next;
    setPath(next);
  }, []);

  useEffect(() => {
    const initial = history.state as Record<string, unknown> | null;
    if (typeof initial?.[KEY] !== 'string') {
      history.replaceState({ ...(initial ?? {}), [KEY]: '' }, '');
    } else {
      go(initial[KEY] as string);
    }

    const onPop = (event: PopStateEvent) => {
      const next = (event.state as Record<string, unknown> | null)?.[KEY];
      go(typeof next === 'string' ? next : '');
    };
    // the thumb buttons are history navigation: stop them acting as "go somewhere" and let popstate work
    const onMouseDown = (event: MouseEvent) => {
      if (event.button === 3 || event.button === 4) event.preventDefault();
    };

    window.addEventListener('popstate', onPop);
    window.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('mousedown', onMouseDown);
    };
  }, [go]);

  // a different folder, or a listing that no longer holds the open folder, starts at the top
  useEffect(() => {
    if (current.current === '') return;
    go('');
    history.replaceState({ ...(history.state ?? {}), [KEY]: '' }, '');
  }, [go, resetKey]);

  const navigate = useCallback(
    (next: string) => {
      if (next === current.current) return;
      history.pushState({ ...(history.state ?? {}), [KEY]: next }, '');
      go(next);
    },
    [go],
  );

  return { path, navigate };
}
