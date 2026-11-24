import type { ReactNode, RefObject, UIEvent } from 'react';

/** The scrolling area a document lives in. `center` is for a single fitted page or slide. */
export function Stage({
  children,
  center = false,
  innerRef,
  onScroll,
}: {
  children: ReactNode;
  center?: boolean;
  innerRef?: RefObject<HTMLDivElement | null>;
  onScroll?: (event: UIEvent<HTMLDivElement>) => void;
}) {
  return (
    <div className={`lb-stage${center ? ' lb-stage-center' : ''}`} ref={innerRef} onScroll={onScroll}>
      {children}
    </div>
  );
}

/** Covers the stage while a document parses, or explains why it did not. */
export function StageOverlay({ children, tone }: { children: ReactNode; tone?: 'error' }) {
  return (
    <div className="lb-overlay" data-tone={tone} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
