import { useIsMobile } from './mobile';

/** True wherever a rail, a toolbar row and a status line fit beside the document. */
export function useIsDesktop(): boolean {
  return !useIsMobile();
}
