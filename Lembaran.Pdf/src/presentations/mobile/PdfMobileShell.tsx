import { useState } from 'react';
import { Icon } from '../library/Icon';
import { IconButton } from '../library/IconButton';
import { PageBox } from '../ui/PdfToolbar';
import { SearchPanel } from '../ui/SearchPanel';
import { PdfViewport } from '../layout/viewport/PdfViewport';
import type { ShellProps } from '../layout/PdfShell';

const COLORS = ['amber', 'green', 'blue', 'rose'] as const;

/** A phone is a workspace, not a narrower desktop: its own header, its own bar. */
export function PdfMobileShell(props: ShellProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const annotating = props.annotations.tool === 'highlight';

  return (
    <div className="pdf-shell pdf-shell-phone">
      <header className="pdf-phone-header">
        <span className="pdf-title" title={props.title}>
          {props.title}
        </span>
        <PageBox page={props.page} numPages={props.doc.numPages} onGoTo={props.onGoTo} />
        {props.fullscreen.supported && (
          <IconButton
            icon={props.fullscreen.active ? 'exitFullscreen' : 'fullscreen'}
            label={props.fullscreen.active ? 'Exit full screen' : 'Full screen'}
            onClick={props.fullscreen.toggle}
          />
        )}
      </header>

      {searchOpen && (
        <div className="pdf-phone-sheet">
          <SearchPanel
            search={props.search}
            onHit={(page) => {
              props.onGoTo(page);
              setSearchOpen(false);
            }}
            onClose={() => setSearchOpen(false)}
          />
        </div>
      )}

      {annotating && (
        <div className="pdf-phone-hint">
          <span>Drag over the page to highlight</span>
          <div className="pdf-swatches">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`pdf-swatch is-${color}${props.annotations.color === color ? ' is-on' : ''}`}
                onClick={() => props.annotations.setColor(color)}
                aria-label={`${color} highlight`}
                aria-pressed={props.annotations.color === color}
              />
            ))}
          </div>
        </div>
      )}

      <PdfViewport
        doc={props.doc}
        scale={props.zoom}
        annotations={props.annotations}
        onPageChange={props.onPageChange}
        onFitScale={props.onFitScale}
        apiRef={props.viewportApi}
      />

      <nav className="pdf-phone-bar" aria-label="Reader controls">
        <button
          type="button"
          className="pdf-phonebtn"
          onClick={() => props.onGoTo(props.page - 1)}
          disabled={props.page <= 1}
          aria-label="Previous page"
        >
          <Icon name="prev" size={20} />
        </button>
        <button type="button" className="pdf-phonebtn" onClick={props.onZoomOut} aria-label="Zoom out">
          <Icon name="zoomOut" size={20} />
        </button>
        <button
          type="button"
          className={`pdf-phonebtn${annotating ? ' is-active' : ''}`}
          onClick={() => props.annotations.setTool(annotating ? 'none' : 'highlight')}
          aria-label={annotating ? 'Stop highlighting' : 'Highlight an area'}
          aria-pressed={annotating}
        >
          <Icon name="annotate" size={20} />
        </button>
        <button
          type="button"
          className="pdf-phonebtn"
          onClick={() => setSearchOpen((open) => !open)}
          aria-label="Find in document"
          aria-pressed={searchOpen}
        >
          <Icon name="search" size={20} />
        </button>
        <button type="button" className="pdf-phonebtn" onClick={props.onZoomIn} aria-label="Zoom in">
          <Icon name="zoomIn" size={20} />
        </button>
        <button
          type="button"
          className="pdf-phonebtn"
          onClick={() => props.onGoTo(props.page + 1)}
          disabled={props.page >= props.doc.numPages}
          aria-label="Next page"
        >
          <Icon name="next" size={20} />
        </button>
      </nav>
    </div>
  );
}
