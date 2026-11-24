// The reusable GUI layer: tokens, theme, device hooks, the general components (rail, paper,
// header, footer, inspector) and the reader frame every format composes from them.
// It frames a document and draws none of it: it knows no format.

export { ThemeProvider, useTheme } from './theme/ThemeProvider';
export { ThemeToggle } from './theme/ThemeToggle';
export {
  DEFAULT_THEME,
  isPreference,
  nextPreference,
  THEME_LABELS,
  THEME_ORDER,
} from './theme/preference';
export { useIsDesktop } from './layout/desktop';
export { useIsMobile } from './layout/mobile';
export { useFullscreen, useIsFullscreen, type FullscreenState } from './layout/fullscreen';
export * from './components';
export * from './shell';
