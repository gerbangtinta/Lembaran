import type { ReactNode, RefObject } from 'react';
import { ThemeToggle } from '../../theme/ThemeToggle';
import { isFramed } from '../frame';
import './phone.css';

export interface PhoneShellProps {
  rootRef?: RefObject<HTMLElement | null>;
  title: string;
  meta?: ReactNode;
  /** controls drawn at the left of the header line — icon buttons, not labels */
  actions?: ReactNode;
  /** the last control on the line, to the right of the theme switch */
  end?: ReactNode;
  /** the scrolling stage */
  children: ReactNode;
  /** controls for the bottom bar */
  bar?: ReactNode;
}

/**
 * The phone frame: one line of context at the top, thumb-sized controls at the bottom. It shares
 * only the neutral stage/root classes with the desktop frame; every phone rule is its own file.
 *
 * The name is printed only when the reader stands alone: inside the hub the framing bar one line up
 * already shows `‹ file name`, so repeating it here spends a row of the phone on nothing. The theme
 * switch always sits at the end of that line — on a phone the hub's own bar is not on screen while a
 * document is open — with the reader's last control after it.
 */
export function PhoneShell({ rootRef, title, meta, actions, end, children, bar }: PhoneShellProps) {
  const framed = isFramed();

  return (
    <div className="lb-root" ref={rootRef as RefObject<HTMLDivElement | null>}>
      <div className="lb-shell">
        <header className="lb-phone-header">
          {actions !== undefined && <div className="lb-phone-actions">{actions}</div>}
          {!framed && (
            <span className="lb-phone-title" title={title}>
              {title}
            </span>
          )}
          {meta !== undefined && <span className="lb-phone-meta">{meta}</span>}
          <div className="lb-phone-actions lb-phone-actions-end">
            <ThemeToggle />
            {end}
          </div>
        </header>
        <div className="lb-body">
          <div className="lb-stage-wrap">{children}</div>
        </div>
        {bar !== undefined && <div className="lb-phone-bar">{bar}</div>}
      </div>
    </div>
  );
}
