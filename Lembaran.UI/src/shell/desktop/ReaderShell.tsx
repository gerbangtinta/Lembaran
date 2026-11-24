import type { ReactNode, RefObject } from 'react';

export interface ReaderShellProps {
  /** the element full screen takes over; pass the same ref the reader uses for its root */
  rootRef?: RefObject<HTMLElement | null>;
  toolbar?: ReactNode;
  banner?: ReactNode;
  panel?: ReactNode;
  /** a right-hand inspector; no reader opens one yet */
  properties?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * The desktop reader frame: toolbar, optional banner, a body with an optional side panel and a
 * scrolling stage, then a status bar. A format supplies content for these slots and nothing else.
 * The phone never renders this — it has its own shell in `../mobile/PhoneShell`.
 */
export function ReaderShell({ rootRef, toolbar, banner, panel, properties, footer, children }: ReaderShellProps) {
  return (
    <div className="lb-root" ref={rootRef as RefObject<HTMLDivElement | null>}>
      <div className="lb-shell">
        {toolbar}
        {banner}
        <div className="lb-body">
          {panel}
          <div className="lb-stage-wrap">{children}</div>
          {properties}
        </div>
        {footer}
      </div>
    </div>
  );
}
