import type { ReactNode, RefObject } from 'react';
import './phone.css';

export interface PhoneShellProps {
  rootRef?: RefObject<HTMLElement | null>;
  title: string;
  meta?: ReactNode;
  /** the scrolling stage */
  children: ReactNode;
  /** controls for the bottom bar */
  bar?: ReactNode;
}

/**
 * The phone frame: one line of context at the top, thumb-sized controls at the bottom. It shares
 * only the neutral stage/root classes with the desktop frame; every phone rule is its own file.
 */
export function PhoneShell({ rootRef, title, meta, children, bar }: PhoneShellProps) {
  return (
    <div className="lb-root" ref={rootRef as RefObject<HTMLDivElement | null>}>
      <div className="lb-shell">
        <header className="lb-phone-header">
          <span className="lb-phone-title" title={title}>
            {title}
          </span>
          {meta !== undefined && <span className="lb-phone-meta">{meta}</span>}
        </header>
        <div className="lb-body">
          <div className="lb-stage-wrap">{children}</div>
        </div>
        {bar !== undefined && <div className="lb-phone-bar">{bar}</div>}
      </div>
    </div>
  );
}
