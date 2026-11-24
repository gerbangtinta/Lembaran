import { useSyncExternalStore } from 'react';

/** A phone or a small tablet: no room for a side rail next to the document. */
const MOBILE_QUERY = '(max-width: 720px)';

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => undefined;
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function matches(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(MOBILE_QUERY).matches
    : false;
}

/** True on a mobile-sized viewport. A primitive: it draws nothing and knows no format. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, matches, () => false);
}
