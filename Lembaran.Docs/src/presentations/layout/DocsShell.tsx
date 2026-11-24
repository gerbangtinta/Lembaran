import { ReaderShell, Stage, StageOverlay, type FullscreenState } from '@lembaran/ui';
import type { RefObject } from 'react';
import { DocsFindBar } from '../ui/DocsFindBar';
import { DocsStatus } from '../ui/DocsStatus';
import { DocsToolbar } from '../ui/DocsToolbar';
import { DocsViewport } from './viewport/DocsViewport';

export interface DocsShellProps {
  name: string;
  zoom: number;
  page: number;
  pages: number;
  busy: boolean;
  error: string | null;
  findOpen: boolean;
  query: string;
  hits: number;
  hitIndex: number;
  fullscreen: FullscreenState;
  rootRef: RefObject<HTMLDivElement | null>;
  paperRef: RefObject<HTMLDivElement | null>;
  viewportRef: RefObject<HTMLDivElement | null>;
  onOpen(): void;
  onZoomIn(): void;
  onZoomOut(): void;
  onFit(): void;
  onPage(delta: 1 | -1): void;
  onFind(open: boolean): void;
  onQuery(value: string): void;
  onStep(direction: 1 | -1): void;
  onScrollPage(page: number): void;
}

export function DocsShell(props: DocsShellProps) {
  return (
    <ReaderShell
      rootRef={props.rootRef}
      toolbar={
        <DocsToolbar
          zoom={props.zoom}
          page={props.page}
          pages={props.pages}
          busy={props.busy}
          fullscreen={props.fullscreen}
          findOpen={props.findOpen}
          onOpen={props.onOpen}
          onZoomIn={props.onZoomIn}
          onZoomOut={props.onZoomOut}
          onFit={props.onFit}
          onPage={props.onPage}
          onFind={props.onFind}
        />
      }
      banner={
        props.findOpen && (
          <DocsFindBar
            query={props.query}
            hits={props.hits}
            current={props.hitIndex}
            onQuery={props.onQuery}
            onStep={props.onStep}
            onClose={() => props.onFind(false)}
          />
        )
      }
      footer={<DocsStatus name={props.name} pages={props.pages} page={props.page} zoom={props.zoom} />}
    >
      <Stage innerRef={props.viewportRef}>
        <DocsViewport paperRef={props.paperRef} viewportRef={props.viewportRef} zoom={props.zoom} pages={props.pages} onPage={props.onScrollPage} />
      </Stage>
      {(props.busy || props.error !== null) && (
        <StageOverlay tone={props.error ? 'error' : undefined}>
          {props.error ?? 'Laying out pages…'}
        </StageOverlay>
      )}
    </ReaderShell>
  );
}
