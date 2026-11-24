import type { RefObject } from 'react';
import { ReaderShell, Stage, StageOverlay, type FullscreenState } from '@lembaran/ui';
import type { Deck } from '../../feature/deck';
import { SlideRail } from '../component/SlideRail';
import { SlideStatus } from '../ui/SlideStatus';
import { SlideToolbar } from '../ui/SlideToolbar';
import { SlideCanvas } from './viewport/SlideCanvas';

export interface SlideShellProps {
  name: string;
  deck: Deck | null;
  index: number;
  scale: number;
  busy: boolean;
  error: string | null;
  fullscreen: FullscreenState;
  rootRef: RefObject<HTMLDivElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  onSlide(delta: number): void;
  onScaleIn(): void;
  onScaleOut(): void;
  onFit(): void;
  onSelect(index: number): void;
}

export function SlideShell(props: SlideShellProps) {
  return (
    <ReaderShell
      rootRef={props.rootRef}
      toolbar={
        <SlideToolbar
          index={props.index}
          slides={props.deck?.slides ?? 0}
          scale={props.scale}
          busy={props.busy}
          fullscreen={props.fullscreen}
          onSlide={props.onSlide}
          onScaleIn={props.onScaleIn}
          onScaleOut={props.onScaleOut}
          onFit={props.onFit}
        />
      }
      panel={
        props.deck && (
          <SlideRail deck={props.deck} current={props.index} onSelect={props.onSelect} />
        )
      }
      footer={
        <SlideStatus
          name={props.name}
          index={props.index}
          slides={props.deck?.slides ?? 0}
          scale={props.scale}
        />
      }
    >
      <Stage center innerRef={props.stageRef}>
        {props.deck && (
          <SlideCanvas deck={props.deck} index={props.index} scale={props.scale} />
        )}
      </Stage>
      {(props.busy || props.error !== null) && (
        <StageOverlay tone={props.error ? 'error' : undefined}>
          {props.error ?? 'Painting the slide…'}
        </StageOverlay>
      )}
    </ReaderShell>
  );
}
