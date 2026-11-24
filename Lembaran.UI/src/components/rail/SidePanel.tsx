import type { CSSProperties, ReactNode } from 'react';

/** Rail geometry is fixed in pixels here, so no CSS variable or aspect-ratio support is required. */
export const RAIL_WIDTH = 168;
export const RAIL_CARD_WIDTH = 122;

/** The width a reader should paint a thumbnail at: the card minus its 2 px padding. */
export const RAIL_THUMB_WIDTH = RAIL_CARD_WIDTH - 4;

export function SidePanel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <nav className="lb-panel" aria-label={label} style={{ width: RAIL_WIDTH }}>
      {children}
    </nav>
  );
}

export interface PanelItemProps {
  number: number;
  label: string;
  current: boolean;
  onSelect(): void;
  /** height ÷ width is derived from this: the page or slide's own width ÷ height */
  aspect: number;
  /** a dot for a page or slide that carries a note */
  noted?: boolean;
  children: ReactNode;
}

export function PanelItem({ number, label, current, onSelect, aspect, noted, children }: PanelItemProps) {
  const height = Math.round(RAIL_CARD_WIDTH / (aspect > 0 ? aspect : 0.75));
  const cardStyle: CSSProperties = { width: RAIL_CARD_WIDTH, height };
  return (
    <button
      type="button"
      className="lb-panel-item"
      aria-current={current}
      aria-label={label}
      title={label}
      onClick={onSelect}
    >
      <span className="lb-panel-number">{number}</span>
      <span className="lb-panel-card" style={cardStyle}>
        {children}
        {noted && <span className="lb-panel-note" aria-hidden="true" />}
      </span>
    </button>
  );
}
