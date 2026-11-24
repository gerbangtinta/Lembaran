import { PhoneShell, Stage, StageOverlay } from '@lembaran/ui';
import { slideLabel } from '../../feature/view';
import { SlideCanvas } from '../layout/viewport/SlideCanvas';
import type { SlideShellProps } from '../layout/SlideShell';

/** Phone: no rail, one slide, the controls a thumb can hit. */
export function SlideMobileShell(props: SlideShellProps) {
  const slides = props.deck?.slides ?? 0;

  return (
    <PhoneShell
      rootRef={props.rootRef}
      title={props.name}
      meta={slideLabel(props.index, slides)}
      bar={
        <>
          <button
            type="button"
            className="lb-phone-action"
            onClick={() => props.onSlide(-1)}
            disabled={props.index <= 0}
            aria-label="Previous slide"
          >
            ‹
          </button>
          <button type="button" className="lb-phone-action" onClick={props.onFit} aria-label="Fit slide">
            Fit
          </button>
          <button
            type="button"
            className="lb-phone-action"
            onClick={() => props.onSlide(1)}
            disabled={props.index >= slides - 1}
            aria-label="Next slide"
          >
            ›
          </button>
        </>
      }
    >
      <Stage center innerRef={props.stageRef}>
        {props.deck && <SlideCanvas deck={props.deck} index={props.index} scale={props.scale} />}
      </Stage>
      {(props.busy || props.error !== null) && (
        <StageOverlay tone={props.error ? 'error' : undefined}>
          {props.error ?? 'Painting the slide…'}
        </StageOverlay>
      )}
    </PhoneShell>
  );
}
