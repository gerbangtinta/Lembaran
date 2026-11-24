import type { ReactNode } from 'react';

export function Toolbar({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="lb-toolbar" role="toolbar" aria-label={label}>
      {children}
    </div>
  );
}

export function ToolbarGroup({ children }: { children: ReactNode }) {
  return <div className="lb-toolbar-group">{children}</div>;
}

/** Pushes everything after it to the far end: usually the theme and full-screen controls. */
export function ToolbarSpacer() {
  return <div className="lb-toolbar-spacer" />;
}

export interface ToolButtonProps {
  /** accessible name; the visible content may be a glyph */
  label: string;
  title?: string;
  onClick(): void;
  pressed?: boolean;
  disabled?: boolean;
  /** bordered surface treatment, for controls that sit outside a group */
  outline?: boolean;
  children: ReactNode;
}

export function ToolButton({ label, title, onClick, pressed, disabled, outline, children }: ToolButtonProps) {
  return (
    <button
      type="button"
      className={`lb-control${outline ? ' lb-control-outline' : ''}`}
      aria-label={label}
      aria-pressed={pressed}
      title={title ?? label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export interface ToolReadoutProps {
  label: string;
  title?: string;
  onClick(): void;
  children: ReactNode;
}

/** A value that is also a control — "100%" that fits the page, "3 / 12" that jumps. */
export function ToolReadout({ label, title, onClick, children }: ToolReadoutProps) {
  return (
    <button
      type="button"
      className="lb-control lb-readout"
      aria-label={label}
      title={title ?? label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
