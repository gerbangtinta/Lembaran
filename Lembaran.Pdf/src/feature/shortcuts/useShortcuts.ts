import { useEffect, useRef } from 'react';

export interface ShortcutActions {
  nextPage(): void;
  previousPage(): void;
  zoomIn(): void;
  zoomOut(): void;
  fitWidth(): void;
  toggleSearch(): void;
  toggleAnnotate(): void;
  toggleFullscreen(): void;
  closeOverlays(): void;
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** Keyboard control, ignored while the user is typing in a field. */
export function useShortcuts(actions: ShortcutActions): void {
  const current = useRef(actions);
  current.current = actions;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const accel = event.ctrlKey || event.metaKey;
      const act = current.current;

      if (accel && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        act.toggleSearch();
        return;
      }
      if (isTyping(event.target)) {
        if (event.key === 'Escape') act.closeOverlays();
        return;
      }
      if (accel) return;

      switch (event.key) {
        case 'ArrowRight':
        case 'PageDown':
          event.preventDefault();
          act.nextPage();
          break;
        case 'ArrowLeft':
        case 'PageUp':
          event.preventDefault();
          act.previousPage();
          break;
        case '+':
        case '=':
          event.preventDefault();
          act.zoomIn();
          break;
        case '-':
        case '_':
          event.preventDefault();
          act.zoomOut();
          break;
        case '0':
          event.preventDefault();
          act.fitWidth();
          break;
        case 'f':
          event.preventDefault();
          act.toggleFullscreen();
          break;
        case 'h':
          event.preventDefault();
          act.toggleAnnotate();
          break;
        case 'Escape':
          act.closeOverlays();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
