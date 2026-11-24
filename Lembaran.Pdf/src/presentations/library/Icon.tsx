import type { ReactNode } from 'react';

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
  | 'thumbnails';

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
