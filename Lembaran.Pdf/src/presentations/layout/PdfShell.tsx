import { useEffect, useState } from 'react';
import type { PDFDocumentProxy } from '../../feature/open';
import type { AnnotationsState } from '../../feature/annotate';
import { ReaderShell, type FullscreenState } from '@lembaran/ui';
import type { SearchState } from '../../feature/search';
import { ThumbnailRail } from '../component/ThumbnailRail';
import { PdfToolbar } from '../ui/PdfToolbar';
import { SearchPanel } from '../ui/SearchPanel';
import { StatusBar } from '../ui/StatusBar';
import { PdfViewport, type PdfViewportApi } from './viewport/PdfViewport';

export interface ShellProps {
  doc: PDFDocumentProxy;
  title: string;
  page: number;
  zoom: number;
  busy: boolean;
  search: SearchState;
  annotations: AnnotationsState;
  fullscreen: FullscreenState;
  viewportApi: { current: PdfViewportApi | null };
  rootRef: { current: HTMLDivElement | null };
  railOpen: boolean;
  searchOpen: boolean;
  onToggleRail(): void;
  onToggleSearch(): void;
  onGoTo(page: number): void;
  onPageChange(page: number): void;
  onZoomIn(): void;
  onZoomOut(): void;
  onFit(): void;
  /** the viewport reporting the scale it computed — never the fit action */
  onFitScale(scale: number): void;
  onOpen(): void;
}

export function PdfShell(props: ShellProps) {
  const marked = new Set(props.annotations.byPage.keys());
  const [aspect, setAspect] = useState(0.77);

  // every card takes the shape of page 1 instead of a number guessed here
  useEffect(() => {
    let cancelled = false;
    void props.doc
      .getPage(1)
      .then((page) => {
        if (cancelled) return;
        const viewport = page.getViewport({ scale: 1 });
        setAspect(viewport.width / viewport.height);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [props.doc]);

  return (
    <ReaderShell
      rootRef={props.rootRef}
      toolbar={
        !props.fullscreen.active ? (
          <PdfToolbar
            page={props.page}
            numPages={props.doc.numPages}
            zoom={props.zoom}
            tool={props.annotations.tool}
            color={props.annotations.color}
            railOpen={props.railOpen}
            searchOpen={props.searchOpen}
            fullscreen={props.fullscreen}
            onGoTo={props.onGoTo}
            onZoomIn={props.onZoomIn}
            onZoomOut={props.onZoomOut}
            onFit={props.onFit}
            onToggleRail={props.onToggleRail}
            onToggleSearch={props.onToggleSearch}
            onToggleAnnotate={() =>
              props.annotations.setTool(props.annotations.tool === 'highlight' ? 'none' : 'highlight')
            }
            onColor={props.annotations.setColor}
            onOpen={props.onOpen}
          />
        ) : (
          <div className="pdf-fullbar">
            <span className="pdf-title" title={props.title}>
              {props.title}
            </span>
            <span className="pdf-fullbar-page">
              {props.page} / {props.doc.numPages}
            </span>
            <button type="button" className="pdf-ghost" onClick={props.fullscreen.toggle}>
              Exit full screen
            </button>
          </div>
        )
      }
      banner={props.searchOpen && <SearchPanel search={props.search} onHit={props.onGoTo} onClose={props.onToggleSearch} />}
      panel={
        props.railOpen &&
        !props.fullscreen.active && (
          <ThumbnailRail
            doc={props.doc}
            page={props.page}
            marked={marked}
            aspect={aspect}
            onSelect={props.onGoTo}
          />
        )
      }
      footer={
        <StatusBar
          page={props.page}
          numPages={props.doc.numPages}
          zoom={props.zoom}
          notes={props.annotations.all.length}
          hint="← → pages · + − zoom · 0 fit · H highlight · F full screen"
        />
      }
    >
      <PdfViewport
        doc={props.doc}
        scale={props.zoom}
        annotations={props.annotations}
        onPageChange={props.onPageChange}
        onFitScale={props.onFitScale}
        apiRef={props.viewportApi}
      />
    </ReaderShell>
  );
}
