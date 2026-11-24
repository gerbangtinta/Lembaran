import { PanelItem, RailThumb, SidePanel } from '@lembaran/ui';
import { useCallback } from 'react';
import { paintDeckSlide, type Deck } from '../../feature/deck';

/** The first screenful is painted without waiting for an observer that a hidden iframe never gets. */
const EAGER_THUMBS = 12;
/** above this many slides the rail paints on demand instead of all at once */
const EAGER_LIMIT = 60;

export interface SlideRailProps {
  deck: Deck;
  current: number;
  onSelect(index: number): void;
}

export function SlideRail({ deck, current, onSelect }: SlideRailProps) {
  return (
    <SidePanel label="Slides">
      {Array.from({ length: deck.slides }, (_, index) => (
        <PanelItem
          key={index}
          number={index + 1}
          label={`Slide ${index + 1}`}
          current={index === current}
          aspect={deck.width / deck.height}
          onSelect={() => onSelect(index)}
        >
          <SlideThumb
            deck={deck}
            index={index}
            eager={index < EAGER_THUMBS || index === current || deck.slides <= EAGER_LIMIT}
          />
        </PanelItem>
      ))}
    </SidePanel>
  );
}

/** The rail owns the card and the lazy painting; the layout engine draws the pixels. */
function SlideThumb({ deck, index, eager }: { deck: Deck; index: number; eager: boolean }) {
  const paint = useCallback(
    (canvas: HTMLCanvasElement, width: number) => paintDeckSlide(deck, index, canvas, width / deck.width),
    [deck, index],
  );

  return <RailThumb paint={paint} eager={eager} />;
}
