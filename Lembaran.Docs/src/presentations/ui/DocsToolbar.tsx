import {
  ThemeToggle,
  Toolbar,
  ToolbarGroup,
  ToolbarSpacer,
  ToolButton,
  ToolReadout,
  type FullscreenState,
} from '@lembaran/ui';
import { pageLabel } from '../../feature/paginate';
import { zoomLabel } from '../../feature/zoom';

export interface DocsToolbarProps {
  zoom: number;
  page: number;
  pages: number;
  busy: boolean;
  fullscreen: FullscreenState;
  findOpen: boolean;
  onOpen(): void;
  onZoomIn(): void;
  onZoomOut(): void;
  onFit(): void;
  onPage(delta: 1 | -1): void;
  onFind(open: boolean): void;
}

export function DocsToolbar(props: DocsToolbarProps) {
  const { zoom, page, pages, busy, fullscreen, findOpen } = props;

  return (
    <Toolbar label="Word controls">
      <ToolButton outline label="Open a Word document" onClick={props.onOpen}>
        Open
      </ToolButton>

      <ToolbarGroup>
        <ToolButton label="Zoom out" title="Zoom out (−)" onClick={props.onZoomOut} disabled={busy}>
          −
        </ToolButton>
        <ToolReadout
          label={`Zoom ${zoomLabel(zoom)}, fit width`}
          title="Fit width (0)"
          onClick={props.onFit}
        >
          {zoomLabel(zoom)}
        </ToolReadout>
        <ToolButton label="Zoom in" title="Zoom in (+)" onClick={props.onZoomIn} disabled={busy}>
          +
        </ToolButton>
      </ToolbarGroup>

      <ToolbarGroup>
        <ToolButton
          label="Previous page"
          title="Previous page (←)"
          onClick={() => props.onPage(-1)}
          disabled={busy || page <= 0}
        >
          ‹
        </ToolButton>
        <span className="lb-readout" aria-live="polite">
          {pageLabel(page, pages)}
        </span>
        <ToolButton
          label="Next page"
          title="Next page (→)"
          onClick={() => props.onPage(1)}
          disabled={busy || page >= pages - 1}
        >
          ›
        </ToolButton>
      </ToolbarGroup>

      <ToolbarSpacer />
      <ToolButton
        label="Find in document"
        title="Find in document (Ctrl+F)"
        pressed={findOpen}
        onClick={() => props.onFind(!findOpen)}
      >
        Find
      </ToolButton>
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
