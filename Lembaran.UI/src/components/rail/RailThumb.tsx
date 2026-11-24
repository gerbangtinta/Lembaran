import { useEffect, useRef, useState } from 'react';
import { RAIL_THUMB_WIDTH } from './SidePanel';

export type ThumbState = 'pending' | 'ready' | 'failed';

/**
 * Paints one thumbnail into the card's canvas at the width the card actually has. The reader owns the
 * drawing — a PDF page and a slide are different engines — the rail owns when it happens. `signal`
 * aborts when the card goes away or the document changes, so an engine can cancel its render.
 */
export type ThumbPainter = (
  canvas: HTMLCanvasElement,
  width: number,
  signal: AbortSignal,
) => Promise<void>;

export interface RailThumbProps {
  /** must be stable (a `useCallback`): a new function is a new picture and repaints the card */
  paint: ThumbPainter;
  /**
   * Paint without waiting for the observer. Use it for a short rail, the first screenful, or the card
   * the reader is on: an IntersectionObserver is not delivered in a backgrounded tab or a hidden
   * iframe, and a rail that depends on it alone stays blank until the reader is focused.
   */
  eager?: boolean;
  /** width used when the card has not been measured yet */
  fallbackWidth?: number;
}

/** A rail card's canvas: painted once per painter, lazily unless `eager`, with a state for the CSS. */
export function RailThumb({ paint, eager = false, fallbackWidth = RAIL_THUMB_WIDTH }: RailThumbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const painted = useRef<ThumbPainter | null>(null);
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<ThumbState>('pending');

  useEffect(() => {
    if (eager) return;
    const host = canvasRef.current;
    if (!host) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.target === host) setVisible(entry.isIntersecting);
      },
      { rootMargin: '300px 0px' },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, [eager]);

  useEffect(() => {
    if (!eager && !visible) return;
    const canvas = canvasRef.current;
    // one paint per painter: scrolling a card back into view, or making it current, must not repaint it
    if (!canvas || painted.current === paint) return;
    painted.current = paint;
    const controller = new AbortController();
    // the card decides the width; painting wider than it would be scaled unevenly
    const width = canvas.clientWidth > 0 ? canvas.clientWidth : fallbackWidth;
    void paint(canvas, width, controller.signal)
      .then(() => {
        if (!controller.signal.aborted) setState('ready');
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setState('failed');
        console.warn('[lembaran] a thumbnail could not be painted', reason);
      });
    return () => {
      controller.abort();
      if (painted.current === paint) painted.current = null;
    };
  }, [eager, visible, paint, fallbackWidth]);

  return <canvas ref={canvasRef} data-state={state} aria-hidden="true" />;
}
