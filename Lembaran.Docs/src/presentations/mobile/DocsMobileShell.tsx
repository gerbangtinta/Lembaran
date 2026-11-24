import { PhoneShell, Stage, StageOverlay } from '@lembaran/ui';
import { pageLabel } from '../../feature/paginate';
import { zoomLabel } from '../../feature/zoom';
import { DocsViewport } from '../layout/viewport/DocsViewport';
import type { DocsShellProps } from '../layout/DocsShell';

/** Phone keeps the pages and four controls; find opens the desktop strip above them. */
export function DocsMobileShell(props: DocsShellProps) {
  return (
    <PhoneShell
      rootRef={props.rootRef}
      title={props.name}
      meta={pageLabel(props.page, props.pages)}
      bar={
        <>
          <button type="button" className="lb-phone-action" onClick={props.onZoomOut} aria-label="Zoom out">
            −
          </button>
          <button
            type="button"
            className="lb-phone-action"
            onClick={props.onFit}
            aria-label={`Zoom ${zoomLabel(props.zoom)}, fit width`}
          >
            {zoomLabel(props.zoom)}
          </button>
          <button type="button" className="lb-phone-action" onClick={props.onZoomIn} aria-label="Zoom in">
            +
          </button>
          <button
            type="button"
            className="lb-phone-action"
            onClick={() => props.onFind(true)}
            aria-label="Find in document"
          >
            Find
          </button>
        </>
      }
    >
      <Stage innerRef={props.viewportRef}>
        <DocsViewport
          paperRef={props.paperRef}
          viewportRef={props.viewportRef}
          zoom={props.zoom}
          pages={props.pages}
          onPage={props.onScrollPage}
        />
      </Stage>
      {(props.busy || props.error !== null) && (
        <StageOverlay tone={props.error ? 'error' : undefined}>
          {props.error ?? 'Laying out pages…'}
        </StageOverlay>
      )}
    </PhoneShell>
  );
}
