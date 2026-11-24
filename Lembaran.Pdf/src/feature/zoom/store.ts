export const ZOOM_MIN = 0.35;
export const ZOOM_MAX = 4;
export const ZOOM_STEPS: readonly number[] = [0.35, 0.5, 0.67, 0.8, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];

export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return 1;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
}

export function nextZoom(zoom: number): number {
  const current = clampZoom(zoom);
  return ZOOM_STEPS.find((step) => step > current + 0.001) ?? ZOOM_MAX;
}

export function previousZoom(zoom: number): number {
  const current = clampZoom(zoom);
  return [...ZOOM_STEPS].reverse().find((step) => step < current - 0.001) ?? ZOOM_MIN;
}

export function formatZoom(zoom: number): string {
  return `${Math.round(clampZoom(zoom) * 100)}%`;
}

/**
 * The scale at which a page of `pageWidth` fits the available width. Used once per
 * document so a phone never opens a document that is wider than the screen.
 */
export function fitZoom(availableWidth: number, pageWidth: number, gutter = 24): number {
  if (availableWidth <= 0 || pageWidth <= 0) return 1;
  return clampZoom((availableWidth - gutter) / pageWidth);
}
