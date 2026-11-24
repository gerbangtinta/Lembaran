export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 3;
export const ZOOM_STEP = 0.1;
/** room for the page margin plus the scrollbar, so "fit width" never clips the paper */
export const FIT_GUTTER = 56;

export function clampZoom(value: number): number {
  if (!Number.isFinite(value)) return 1;
  const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
  return Math.round(clamped * 100) / 100;
}

/** Never magnifies a page beyond 100%: a small page in a wide window stays its own size. */
export function fitZoom(viewportWidth: number, pageWidth: number, gutter = FIT_GUTTER): number {
  if (pageWidth <= 0 || viewportWidth <= 0) return 1;
  return clampZoom(Math.min(1, (viewportWidth - gutter) / pageWidth));
}

export function stepZoom(current: number, direction: 1 | -1): number {
  return clampZoom(current + direction * ZOOM_STEP);
}

export function zoomLabel(zoom: number): string {
  return `${Math.round(zoom * 100)}%`;
}
