import type { ReactNode } from 'react';

/** The glyphs a toolbar or a phone header asks for by name: one stroke set, one visual weight. */
export type IconName =
  | 'search'
  | 'prev'
  | 'next'
  | 'zoomIn'
  | 'zoomOut'
  | 'fit'
  | 'annotate'
  | 'fullscreen'
  | 'exitFullscreen'
  | 'rail'
  | 'trash'
  | 'close'
  | 'open'
  | 'thumbnails'
  | 'columns'
  | 'pages'
  | 'save'
  | 'ink'
  | 'text'
  | 'image'
  | 'rotateLeft'
  | 'rotateRight'
  | 'fitWidth'
  | 'fitHeight'
  | 'undo'
  | 'redo'
  | 'editText'
  | 'insert'
  | 'signature'
  | 'compress';

const PATHS: Record<IconName, ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" strokeLinecap="round" />
    </>
  ),
  prev: <path d="m14.5 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />,
  next: <path d="m9.5 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />,
  zoomIn: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M11 8.5v5M8.5 11h5M16 16l4.5 4.5" strokeLinecap="round" />
    </>
  ),
  zoomOut: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M8.5 11h5M16 16l4.5 4.5" strokeLinecap="round" />
    </>
  ),
  fit: (
    <>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  annotate: (
    <>
      <path d="M4 20h4l9.5-9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" strokeLinejoin="round" />
      <path d="m14 6 4 4" strokeLinecap="round" />
    </>
  ),
  fullscreen: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" strokeLinecap="round" strokeLinejoin="round" />,
  exitFullscreen: <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" strokeLinecap="round" strokeLinejoin="round" />,
  rail: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M9.5 4.5v15" />
    </>
  ),
  thumbnails: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M7 8h6M7 12h10M7 16h8" strokeLinecap="round" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />,
  open: <path d="M4 7h6l2 2h8v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7Z" strokeLinejoin="round" />,
  columns: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M9.5 4.5v15M14.5 4.5v15" />
    </>
  ),
  rotateLeft: (
    <>
      <path d="M4 10a8 8 0 1 1 2.5 6.4" strokeLinecap="round" />
      <path d="M4 4v6h6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  rotateRight: (
    <>
      <path d="M20 10A8 8 0 1 0 17.5 16.4" strokeLinecap="round" />
      <path d="M20 4v6h-6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  fitWidth: (
    <>
      <path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  fitHeight: (
    <>
      <path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  undo: (
    <>
      <path d="M8.5 5 4 9.5 8.5 14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 9.5h9.5a5 5 0 0 1 0 10H10" strokeLinecap="round" />
    </>
  ),
  redo: (
    <>
      <path d="M15.5 5 20 9.5 15.5 14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 9.5h-9.5a5 5 0 0 0 0 10H14" strokeLinecap="round" />
    </>
  ),
  editText: (
    <>
      <path d="M4 5h9M8.5 5v9M6 14h5" strokeLinecap="round" />
      <path d="M13 20v-3.5l5-5 3.5 3.5-5 5H13Z" strokeLinejoin="round" />
    </>
  ),
  insert: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M12 9.2v5.6M9.2 12h5.6" strokeLinecap="round" />
    </>
  ),
  signature: (
    <>
      <path d="M4 16c3 0 4.5-6 7-6s1.5 6 3.5 6 3-2.5 5.5-2.5" strokeLinecap="round" />
      <path d="M5 20h14" strokeLinecap="round" />
    </>
  ),
  ink: (
    <>
      <path d="M5 19c3.5 0 5-2 6.5-6S15 5 19 5" strokeLinecap="round" />
      <path d="M15 5h4v4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  text: (
    <>
      <path d="M5 19 11 5l6 14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 14h7" strokeLinecap="round" />
    </>
  ),
  image: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m5 17 5-5 4 4 2.5-2.5 3 3.5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  save: (
    <>
      <path d="M5 4.5h10.5L19.5 8.5V19a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V5a.5.5 0 0 1 .5-.5Z" strokeLinejoin="round" />
      <path d="M8 4.5v5h7v-5M8 19.5v-5h8v5" strokeLinejoin="round" />
    </>
  ),
  pages: (
    <>
      <rect x="4.5" y="7.5" width="11" height="13" rx="1.5" />
      <path d="M8 7.5V5a1 1 0 0 1 1-1h9.5a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H15.5" />
    </>
  ),
  // arrows turned inward over a page: the file, made smaller
  compress: (
    <>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </>
  ),
};

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      {PATHS[name]}
    </svg>
  );
}
