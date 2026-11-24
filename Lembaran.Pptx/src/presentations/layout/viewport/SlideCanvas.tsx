import { Surface } from '@lembaran/ui';
import { useEffect, useRef } from 'react';
import { paintDeckSlide, type Deck } from '../../../feature/deck';

export interface SlideCanvasProps {
  deck: Deck;
  index: number;
  scale: number;
}

/** The current slide, painted to a canvas. One canvas, repainted — never a canvas per slide. */
export function SlideCanvas({ deck, index, scale }: SlideCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    void paintDeckSlide(deck, index, canvas, scale).catch(() => undefined);
  }, [deck, index, scale]);

  return (
    <Surface>
      <canvas ref={canvasRef} className="pptx-slide" role="img" aria-label={`Slide ${index + 1}`} />
    </Surface>
  );
}
