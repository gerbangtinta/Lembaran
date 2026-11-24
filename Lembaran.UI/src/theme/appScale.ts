/**
 * App scale: Ctrl/⌘ + wheel grows or shrinks Lembaran itself instead of leaving the browser to zoom the
 * whole page. The scale is a preference like the theme — stored once, shared by every frame — and it is
 * applied to `#root` (with the viewport divided out, see tokens.css), so the shell still fills the window
 * at 150% and a reader inside the hub is scaled exactly once, by its parent.
 */
import { useSyncExternalStore } from 'react';

const KEY = 'lembaran.scale';
const MIN = 0.8;
const MAX = 1.5;
const STEP = 1.1;

/** Fired inside a reader when Ctrl/⌘ + wheel asks to zoom the document rather than the app. */
export const ZOOM_REQUEST = 'lembaran:zoom';

let current = 1;
let installed = false;
let zoomHandlers = 0;
const listeners = new Set<() => void>();

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX, Math.max(MIN, Math.round(value * 100) / 100));
}

function readStored(): number {
  try {
    const stored = window.localStorage.getItem(KEY);
    if (stored !== null) return clamp(Number(stored));
  } catch {
    // a disabled store is not a reason to fail: default scale
  }
  return 1;
}

/** A reader inside the hub is already scaled by the frame that holds it. */
function ownsScale(): boolean {
  try {
    return window.top === window.self;
  } catch {
    return false;
  }
}

function apply(scale: number): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (!ownsScale()) {
    root.style.removeProperty('--lb-app-scale');
    return;
  }
  if (scale === 1) root.style.removeProperty('--lb-app-scale');
  else root.style.setProperty('--lb-app-scale', String(scale));
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function getScale(): number {
  return current;
}

export function subscribeScale(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setScale(next: number): void {
  const value = clamp(next);
  if (value === current) return;
  current = value;
  try {
    window.localStorage.setItem(KEY, String(value));
  } catch {
    // the choice will not survive a reload; this session still follows it
  }
  apply(value);
  emit();
}

export function stepScale(direction: -1 | 1): void {
  setScale(direction === 1 ? current * STEP : current / STEP);
}

export function resetScale(): void {
  setScale(1);
}

/** The current scale and the three ways to change it. */
export function useAppScale(): {
  scale: number;
  setScale(next: number): void;
  step(direction: -1 | 1): void;
  reset(): void;
} {
  const scale = useSyncExternalStore(subscribeScale, getScale, () => 1);
  return { scale, setScale, step: stepScale, reset: resetScale };
}

/**
 * Registers the document zoom a reader controls. While one is registered — a reader, embedded or opened on
 * its own — Ctrl/⌘ + wheel zooms the document (re-rendered at that scale, so a canvas stays sharp) instead of
 * scaling the app around it.
 */
export function onZoomRequest(handler: (direction: -1 | 1) => void): () => void {
  zoomHandlers += 1;
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<{ direction?: number }>).detail;
    handler(detail?.direction === 1 ? 1 : -1);
  };
  window.addEventListener(ZOOM_REQUEST, listener);
  return () => {
    window.removeEventListener(ZOOM_REQUEST, listener);
    zoomHandlers = Math.max(0, zoomHandlers - 1);
  };
}

/**
 * Turns Ctrl/⌘ + wheel into a document zoom where a reader is in charge, and into an app zoom in the hub.
 * Idempotent, so StrictMode's double mount is harmless.
 */
export function installAppScale(): () => void {
  if (installed || typeof window === 'undefined') return () => undefined;
  installed = true;
  current = readStored();
  apply(current);

  const onWheel = (event: WheelEvent) => {
    if (!event.ctrlKey && !event.metaKey) return;
    // the point of the handler: the browser must not zoom the page around us
    event.preventDefault();
    const direction: -1 | 1 = event.deltaY < 0 ? 1 : -1;
    if (zoomHandlers > 0) {
      // a reader owns the view: zoom it, so a canvas is re-rendered instead of scaled
      window.dispatchEvent(new CustomEvent(ZOOM_REQUEST, { detail: { direction } }));
      return;
    }
    if (!ownsScale()) return;
    stepScale(direction);
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY || event.newValue === null) return;
    const value = clamp(Number(event.newValue));
    if (value === current) return;
    current = value;
    apply(value);
    emit();
  };

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('storage', onStorage);
    installed = false;
  };
}
