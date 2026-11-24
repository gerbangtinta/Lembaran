import type { PointerEventHandler, ReactNode } from 'react';

export interface SurfaceProps {
  children: ReactNode;
  /** width ÷ height; holds the paper's shape while the canvas is still painting */
  aspect?: number;
  className?: string;
  onPointerDown?: PointerEventHandler<HTMLDivElement>;
}

/**
 * The sheet a document is drawn on: white paper, a hairline edge, the app shadow. A page, a slide or a
 * print preview is a `Surface` with its own canvas inside, so every reader's paper agrees. The engine
 * still draws the content — this only frames it.
 */
export function Surface({ children, aspect, className, onPointerDown }: SurfaceProps) {
  return (
    <div
      className={`lb-surface${className ? ` ${className}` : ''}`}
      style={aspect !== undefined && aspect > 0 ? { aspectRatio: String(aspect) } : undefined}
      onPointerDown={onPointerDown}
    >
      {children}
    </div>
  );
}
