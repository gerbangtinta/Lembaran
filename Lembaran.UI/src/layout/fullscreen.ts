import { useCallback, useSyncExternalStore } from 'react';

export interface FullscreenState {
  supported: boolean;
  active: boolean;
  toggle(): void;
}

function subscribe(onChange: () => void): () => void {
  if (typeof document === 'undefined') return () => undefined;
  document.addEventListener('fullscreenchange', onChange);
  return () => document.removeEventListener('fullscreenchange', onChange);
}

function active(): boolean {
  return typeof document !== 'undefined' && document.fullscreenElement !== null;
}

/** True while the reader owns the whole window: the immersive mode with no page chrome around it. */
export function useIsFullscreen(): boolean {
  return useSyncExternalStore(subscribe, active, () => false);
}

/** Real fullscreen for any Lembaran front-end; `active` is `useIsFullscreen`, `toggle` asks the browser. */
export function useFullscreen(target: { current: HTMLElement | null }): FullscreenState {
  const isFullscreen = useIsFullscreen();
  const supported = typeof document !== 'undefined' && document.fullscreenEnabled;

  const toggle = useCallback(() => {
    if (!supported) return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void target.current?.requestFullscreen().catch(() => undefined);
  }, [supported, target]);

  return { supported, active: isFullscreen, toggle };
}
