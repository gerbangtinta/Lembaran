import type { PageSize, TextPiece } from '../../../feature/open';

/**
 * Paints selectable text over the canvas. The glyphs come from the canvas, so these
 * runs are invisible — they exist for selection, copy and browser find.
 */
export function paintTextLayer(
  container: HTMLElement,
  pieces: readonly TextPiece[],
  size: PageSize,
): void {
  container.style.width = `${size.width}px`;
  container.style.height = `${size.height}px`;

  const runs = pieces.map((piece) => {
    const span = document.createElement('span');
    span.textContent = piece.text;
    span.style.left = `${piece.left}px`;
    span.style.top = `${piece.top}px`;
    span.style.fontSize = `${piece.fontSize}px`;
    return span;
  });

  container.replaceChildren(...runs);
}
