import { useEffect, useState } from 'react';
import type { PDFDocumentProxy } from '../../feature/open';
import type { AnnotationsState } from '../../feature/annotate';
import type { DisplayPage } from '../../feature/edit';
import { ReaderShell, type FullscreenState } from '@lembaran/ui';
import type { SearchState } from '../../feature/search';
import { ThumbnailRail } from '../component/ThumbnailRail';
import { PdfToolbar } from '../ui/PdfToolbar';
import { SearchPanel } from '../ui/SearchPanel';
import { StatusBar } from '../ui/StatusBar';
import { PdfViewport, type PdfViewportApi } from './viewport/PdfViewport';
import type { EditSurface } from './viewport/PageCanvas';
import type { EditTool } from './viewport/EditLayer';

export interface ShellProps {
  doc: PDFDocumentProxy;
  title: string;
  /** the sequence being drawn: deletions, rotations and blanks already applied */
  pages: readonly DisplayPage[];
  /** 1-based display position */
  page: number;
  /** a source page's place in the sequence, for search hits and notes */
  displayOf(source: number): number;
  /** false when the sequence holds a single page */
  canDeletePage: boolean;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo(): void;
  onRedo(): void;
  fitMode: 'width' | 'height';
  onToggleFitMode(): void;
  onPlaceImage(): void;
  onPlaceSignature(): void;
  /** pick a run of the page's own text and replace it */
  onEditText(): void;
  /** a picture is armed: the next click on a page places it */
  placingRole: 'image' | 'signature' | 'stamp' | null;
  /** the status line's sentence, when the reader has something to say about the next click */
  hint?: string;
  edit: EditSurface;
  editTool: EditTool;
  onEditTool(tool: EditTool): void;
  /** ask, then write over the file the document came from */
  onSave(): void;
  /** the compression window: presets, a target size, or every dial by hand */
  onCompress(): void;
  /** the original can be written at all: false means a copy is saved */
  canOverwrite: boolean;
  onRotatePage(delta: 90 | -90): void;
  onDeletePage(): void;
  /** `display` names the page the blank goes after; omitted means the page the reader is on */
  onInsertBlankPage(display?: number): void;
  onMovePage(from: number, to: number): void;
  onRotatePageAt(display: number, delta: 90 | -90): void;
  onDeletePageAt(display: number): void;
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
            numPages={props.pages.length}
            zoom={props.zoom}
            tool={props.annotations.tool}
            color={props.annotations.color}
            railOpen={props.railOpen}
            searchOpen={props.searchOpen}
            fullscreen={props.fullscreen}
            canDelete={props.canDeletePage}
            dirty={props.dirty}
            canUndo={props.canUndo}
            canRedo={props.canRedo}
            onUndo={props.onUndo}
            onRedo={props.onRedo}
            fitMode={props.fitMode}
            onToggleFitMode={props.onToggleFitMode}
            onPlaceImage={props.onPlaceImage}
            onPlaceSignature={props.onPlaceSignature}
            onEditText={props.onEditText}
            placingRole={props.placingRole}
            editTool={props.editTool}
            onEditTool={props.onEditTool}
            onSave={props.onSave}
            onCompress={props.onCompress}
            canOverwrite={props.canOverwrite}
            onRotate={props.onRotatePage}
            onDeletePage={props.onDeletePage}
            onInsertBlank={props.onInsertBlankPage}
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
              {props.page} / {props.pages.length}
            </span>
            <button type="button" className="pdf-ghost" onClick={props.fullscreen.toggle}>
              Exit full screen
            </button>
          </div>
        )
      }
      banner={
        props.searchOpen && (
          <SearchPanel
            search={props.search}
            onHit={(source) => props.onGoTo(props.displayOf(source))}
            onClose={props.onToggleSearch}
          />
        )
      }
      panel={
        props.railOpen &&
        !props.fullscreen.active && (
          <ThumbnailRail
            doc={props.doc}
            pages={props.pages}
            page={props.page}
            marked={marked}
            aspect={aspect}
            onSelect={props.onGoTo}
            onMove={props.onMovePage}
            onRotate={props.onRotatePageAt}
            onInsertBlank={props.onInsertBlankPage}
            onDelete={props.onDeletePageAt}
            canDelete={props.canDeletePage}
          />
        )
      }
      footer={
        <StatusBar
          page={props.page}
          numPages={props.pages.length}
          zoom={props.zoom}
          notes={props.annotations.all.filter((item) => !item.baked).length}
          hint={props.hint ?? '← → pages · + − zoom · 0 fit · H highlight · F full screen'}
        />
      }
    >
      <PdfViewport
        doc={props.doc}
        scale={props.zoom}
        annotations={props.annotations}
        pages={props.pages}
        edit={props.edit}
        searchQuery={props.search.query}
        onPageChange={props.onPageChange}
        onFitScale={props.onFitScale}
        apiRef={props.viewportApi}
      />
    </ReaderShell>
  );
}
