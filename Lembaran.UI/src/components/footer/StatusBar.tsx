import type { ReactNode } from 'react';

export function StatusBar({ children }: { children: ReactNode }) {
  return <footer className="lb-status">{children}</footer>;
}

export function StatusName({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span className="lb-status-name" title={title}>
      {children}
    </span>
  );
}

export function StatusSeparator() {
  return (
    <span className="lb-status-sep" aria-hidden="true">
      ·
    </span>
  );
}

export function StatusHint({ children }: { children: ReactNode }) {
  return <span className="lb-status-hint">{children}</span>;
}

export function StatusWarn({ children }: { children: ReactNode }) {
  return <span className="lb-status-warn">{children}</span>;
}
