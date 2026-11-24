export const MIN_SCALE = 0.2;
export const MAX_SCALE = 3;
export const SCALE_STEP = 0.1;
/** breathing room around the slide, so a fitted slide never touches the scrollbar */
export const FIT_GUTTER = 48;

export function clampScale(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.round(Math.min(MAX_SCALE, Math.max(MIN_SCALE, value)) * 100) / 100;
}

/** Largest scale that keeps the whole slide visible, never above 100%. */
export function fitScale(
  viewportWidth: number,
  viewportHeight: number,
  slideWidth: number,
  slideHeight: number,
  gutter = FIT_GUTTER,
): number {
  if (slideWidth <= 0 || slideHeight <= 0 || viewportWidth <= 0 || viewportHeight <= 0) return 1;
  const width = (viewportWidth - gutter) / slideWidth;
  const height = (viewportHeight - gutter) / slideHeight;
  return clampScale(Math.min(1, width, height));
}

export function stepScale(current: number, direction: 1 | -1): number {
  return clampScale(current + direction * SCALE_STEP);
}

export function stepSlide(index: number, total: number, delta: number): number {
  if (total <= 0) return 0;
  return Math.min(Math.max(0, index + delta), total - 1);
}

export function slideLabel(index: number, total: number): string {
  return total <= 0 ? '0 / 0' : `${index + 1} / ${total}`;
}

export function scaleLabel(scale: number): string {
  return `${Math.round(scale * 100)}%`;
}
