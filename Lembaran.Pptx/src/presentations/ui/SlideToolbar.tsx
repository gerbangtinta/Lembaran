import { ThemeToggle, Toolbar, ToolbarGroup, ToolbarSpacer, ToolButton, ToolReadout, type FullscreenState } from '@lembaran/ui';
import { scaleLabel, slideLabel } from '../../feature/view';

export interface SlideToolbarProps {
  index: number;
  slides: number;
  scale: number;
  busy: boolean;
  fullscreen: FullscreenState;
  onSlide(delta: number): void;
  onScaleIn(): void;
  onScaleOut(): void;
  onFit(): void;
}

export function SlideToolbar(props: SlideToolbarProps) {
  const { index, slides, scale, busy, fullscreen } = props;

  return (
    <Toolbar label="PowerPoint controls">
      <ToolbarGroup>
        <ToolButton
          label="Previous slide"
          title="Previous slide (←)"
          onClick={() => props.onSlide(-1)}
          disabled={busy || index <= 0}
        >
          ‹
        </ToolButton>
        <span className="lb-readout" aria-live="polite">
          {slideLabel(index, slides)}
        </span>
        <ToolButton
          label="Next slide"
          title="Next slide (→)"
          onClick={() => props.onSlide(1)}
          disabled={busy || index >= slides - 1}
        >
          ›
        </ToolButton>
      </ToolbarGroup>

      <ToolbarGroup>
        <ToolButton label="Zoom out" title="Zoom out (−)" onClick={props.onScaleOut} disabled={busy}>
          −
        </ToolButton>
        <ToolReadout
          label={`Zoom ${scaleLabel(scale)}, fit slide`}
          title="Fit slide (0)"
          onClick={props.onFit}
        >
          {scaleLabel(scale)}
        </ToolReadout>
        <ToolButton label="Zoom in" title="Zoom in (+)" onClick={props.onScaleIn} disabled={busy}>
          +
        </ToolButton>
      </ToolbarGroup>

      <ToolbarSpacer />
      <ThemeToggle />
      {fullscreen.supported && (
        <ToolButton
          outline
          label={fullscreen.active ? 'Exit full screen' : 'Full screen'}
          title="Full screen (F)"
          pressed={fullscreen.active}
          onClick={fullscreen.toggle}
        >
          {fullscreen.active ? 'Exit full screen' : 'Full screen'}
        </ToolButton>
      )}
    </Toolbar>
  );
}
