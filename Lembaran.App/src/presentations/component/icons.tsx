/** Icons the hub needs. Neutral drawings, shared by the desk and the phone. */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** Arrows pushing out of opposite corners: give this folder the big window. */
export function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...stroke}>
      <path d="M4 9V4h5" />
      <path d="M20 15v5h-5" />
      <path d="M9 4 4 9M15 20l5-5" />
      <path d="M13 11h7v7" />
      <path d="M11 13H4V6" />
    </svg>
  );
}

/** A folder with a circular arrow: point the browser at a different folder. */
export function SwapFolderIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...stroke}>
      <path d="M3 8.5h5l2 2.5h6.5V19H3z" />
      <path d="M16.5 4.5a4.5 4.5 0 1 1-1.3 8.3" />
      <path d="M15 12.8h2.3V10.5" />
    </svg>
  );
}

/** A broken chain: stop remembering this folder. */
export function UnlinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...stroke}>
      <path d="M9.5 14.5 12 12" />
      <path d="m14 10 3-3" />
      <path d="M11 6.5 12.6 5a3.9 3.9 0 0 1 5.5 5.5L16.5 12" />
      <path d="M7.5 12 5.9 13.6A3.9 3.9 0 0 0 11.4 19l1.6-1.6" />
      <path d="M4 4l3 3M20 20l-3-3" />
    </svg>
  );
}

export function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...stroke}>
      <path d="M3 7.5h6l2 2.5h10v9H3z" />
    </svg>
  );
}

export function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...stroke}>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
    </svg>
  );
}

export function ParentIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" {...stroke}>
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" {...stroke}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}
