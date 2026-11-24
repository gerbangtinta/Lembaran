import { useEffect, useRef } from 'react';

export interface ShortcutActions {
  nextPage(): void;
  previousPage(): void;
  zoomIn(): void;
  zoomOut(): void;
  fitWidth(): void;
  toggleSearch(): void;
  toggleAnnotate(): void;
  /** the pen: `D`, the key the button's own label promises */
  toggleInk(): void;
  /** put the armed tool down without clearing a selection — Enter, or the bar's Done */
  finishTool(): void;
  /** Ctrl+S: ask, then write over the file */
  save(): void;
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
      const act = current.current;
      // Escape is the cancel key and nothing in the reader claims it, so it is handled before the
      // "already used" guard: Chrome marks Escape as used while a pointer gesture is in flight, which is
      // exactly when a reader wants to be able to put a tool down.
      if (event.key === 'Escape') {
        act.closeOverlays();
        return;
      }
      if (event.defaultPrevented) return;
      const accel = event.ctrlKey || event.metaKey;

      if (accel && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        act.toggleSearch();
        return;
      }
      if (accel && event.key.toLowerCase() === 's') {
        event.preventDefault();
        act.save();
        return;
      }
      if (isTyping(event.target)) return;
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
        case 'd':
          event.preventDefault();
          act.toggleInk();
          break;
        case 'Enter':
          // the key that finishes a tool: a stroke is committed as it is drawn, so this only puts the pen down
          if (event.target instanceof HTMLButtonElement) return;
          event.preventDefault();
          act.finishTool();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
