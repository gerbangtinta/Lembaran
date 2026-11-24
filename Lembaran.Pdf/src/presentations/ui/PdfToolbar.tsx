import type { AnnotateTool, AnnotationColor } from '../../feature/annotate';
import type { FullscreenState } from '@lembaran/ui';
import { ThemeToggle } from '@lembaran/ui';
import { IconButton } from '../library/IconButton';

const COLORS: AnnotationColor[] = ['amber', 'green', 'blue', 'rose'];

export interface ToolbarProps {
  page: number;
  numPages: number;
  zoom: number;
  tool: AnnotateTool;
  color: AnnotationColor;
  railOpen: boolean;
  searchOpen: boolean;
  fullscreen: FullscreenState;
  onGoTo(page: number): void;
  onZoomIn(): void;
  onZoomOut(): void;
  onFit(): void;
  onToggleRail(): void;
  onToggleSearch(): void;
  onToggleAnnotate(): void;
  onColor(color: AnnotationColor): void;
  onOpen(): void;
}

/** The desktop top bar: every control grouped by what it acts on. */
export function PdfToolbar(props: ToolbarProps) {
  return (
    <div className="pdf-topbar" role="toolbar" aria-label="Reader controls">
      <div className="pdf-topbar-lead">
        <IconButton
          icon="rail"
          label={props.railOpen ? 'Hide pages' : 'Show pages'}
          onClick={props.onToggleRail}
          pressed={props.railOpen}
        />
        <IconButton icon="open" label="Open another file" onClick={props.onOpen} />
      </div>

      <div className="pdf-seg" aria-label="Navigation">
        <IconButton
          icon="prev"
          label="Previous page"
          onClick={() => props.onGoTo(props.page - 1)}
          disabled={props.page <= 1}
        />
        <PageBox page={props.page} numPages={props.numPages} onGoTo={props.onGoTo} />
        <IconButton
          icon="next"
          label="Next page"
          onClick={() => props.onGoTo(props.page + 1)}
          disabled={props.page >= props.numPages}
        />
      </div>

      <div className="pdf-seg" aria-label="Zoom">
        <IconButton icon="zoomOut" label="Zoom out" onClick={props.onZoomOut} />
        <span className="pdf-zoom" aria-live="polite">
          {Math.round(props.zoom * 100)}%
        </span>
        <IconButton icon="zoomIn" label="Zoom in" onClick={props.onZoomIn} />
        <IconButton icon="fit" label="Fit width (0)" onClick={props.onFit} />
      </div>

      <div className="pdf-topbar-trail">
        <div className={`pdf-seg${props.tool === 'highlight' ? ' is-live' : ''}`} aria-label="Annotate">
          <IconButton
            icon="annotate"
            label={props.tool === 'highlight' ? 'Stop highlighting' : 'Highlight an area (H)'}
            onClick={props.onToggleAnnotate}
            pressed={props.tool === 'highlight'}
            active={props.tool === 'highlight'}
          />
          {props.tool === 'highlight' &&
            COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`pdf-swatch is-${color}${props.color === color ? ' is-on' : ''}`}
                onClick={() => props.onColor(color)}
                aria-label={`${color} highlight`}
                aria-pressed={props.color === color}
              />
            ))}
        </div>
        <IconButton
          icon="search"
          label="Find in document (Ctrl+F)"
          onClick={props.onToggleSearch}
          pressed={props.searchOpen}
          active={props.searchOpen}
        />
        <ThemeToggle />
        {props.fullscreen.supported && (
          <IconButton
            icon={props.fullscreen.active ? 'exitFullscreen' : 'fullscreen'}
            label={props.fullscreen.active ? 'Exit full screen (F)' : 'Full screen (F)'}
            onClick={props.fullscreen.toggle}
            pressed={props.fullscreen.active}
          />
        )}
      </div>
    </div>
  );
}

export function PageBox({
  page,
  numPages,
  onGoTo,
}: {
  page: number;
  numPages: number;
  onGoTo(page: number): void;
}) {
  return (
    <label className="pdf-pagebox">
      <span className="pdf-visually-hidden">Page</span>
      <input
        type="number"
        min={1}
        max={numPages}
        value={page}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next) && next >= 1 && next <= numPages) onGoTo(next);
        }}
        className="pdf-pageinput"
        aria-label="Page"
      />
      <span className="pdf-pagecount">of {numPages}</span>
    </label>
  );
}
