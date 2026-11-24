import { ThemeToggle, Toolbar, ToolbarGroup, ToolbarSpacer, ToolButton, ToolReadout, type FullscreenState } from '@lembaran/ui';
import { zoomLabel } from '../../feature/view';

export interface ExcelToolbarProps {
  zoom: number;
  busy: boolean;
  findOpen: boolean;
  fullscreen: FullscreenState;
  onOpen(): void;
  onZoomIn(): void;
  onZoomOut(): void;
  onResetZoom(): void;
  onToggleFind(): void;
}

export function ExcelToolbar(props: ExcelToolbarProps) {
  const { zoom, busy, findOpen, fullscreen } = props;

  return (
    <Toolbar label="Excel controls">
      <ToolButton outline label="Open a spreadsheet" onClick={props.onOpen} disabled={busy}>
        Open
      </ToolButton>

      <ToolbarGroup>
        <ToolButton label="Zoom out" title="Zoom out (−)" onClick={props.onZoomOut} disabled={busy}>
          −
        </ToolButton>
        <ToolReadout label={`Zoom ${zoomLabel(zoom)}, reset to 100%`} title="Reset zoom (0)" onClick={props.onResetZoom}>
          {zoomLabel(zoom)}
        </ToolReadout>
        <ToolButton label="Zoom in" title="Zoom in (+)" onClick={props.onZoomIn} disabled={busy}>
          +
        </ToolButton>
      </ToolbarGroup>

      <ToolButton
        outline
        label="Find in workbook"
        title="Find in workbook (Ctrl+F)"
        pressed={findOpen}
        onClick={props.onToggleFind}
        disabled={busy}
      >
        Find
      </ToolButton>

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
