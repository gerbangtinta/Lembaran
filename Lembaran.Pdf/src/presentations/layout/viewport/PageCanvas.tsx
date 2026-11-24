import { Surface } from '@lembaran/ui';
import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, TextPiece } from '../../../feature/open';
import { textPieces } from '../../../feature/open';
import type { AnnotationsState } from '../../../feature/annotate';
import { AnnotationLayer } from './AnnotationLayer';
import { EditLayer, type EditTool, type ItemBox, type PendingPlacement } from './EditLayer';
import type { EditItem, NewEditItem } from '../../../storage/edits';
import { paintTextLayer } from './TextLayer';

interface Props {
  doc: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  annotations: AnnotationsState;
  /** the reader's own quarter turn for this page, applied to the pixels and the text runs alike */
  rotation?: 0 | 90 | 180 | 270;
  edit: EditSurface;
  /** the find term: matching runs are marked so a hit can be seen, not just counted */
  searchQuery?: string;
}

/** What the placed items need from the reader, gathered so the page does not carry nine more props. */
export interface EditSurface {
  tool: EditTool;
  color: string;
  selectedId: string | null;
  /** a picture waiting for a click, when the reader picked one */
  pending: PendingPlacement | null;
  itemsOn(source: number): readonly EditItem[];
  create(item: NewEditItem): void;
  updateItem(id: string, box: ItemBox): void;
  removeItem(id: string): void;
  editText(item: Extract<EditItem, { kind: 'text' }>): void;
  /** a run of the page's own text, picked to be covered and rewritten */
  editRun(source: number, run: TextPiece): void;
  placePending(box: ItemBox, source: number): void;
  placeText(point: { x: number; y: number }, source: number): void;
  select(id: string | null): void;
}

/** One page: canvas for the glyphs, an overlaid text layer for selection, highlights above both. */
export function PageCanvas({ doc, pageNumber, scale, annotations, rotation = 0, edit, searchQuery = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  /** the page's own runs, in the same normalised space a replacement is recorded in */
  const [runs, setRuns] = useState<TextPiece[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let renderTask: { cancel(): void } | null = null;

    void (async () => {
      try {
        const page = await doc.getPage(pageNumber);
        const canvas = canvasRef.current;
        if (cancelled || !canvas) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: scale * dpr, rotation });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${viewport.width / dpr}px`;
        canvas.style.height = `${viewport.height / dpr}px`;

        const task = page.render({ canvas, viewport });
        renderTask = task;
        await task.promise;
        if (cancelled) return;

        const cssSize = { width: viewport.width / dpr, height: viewport.height / dpr };
        const pieces = await textPieces(page, scale, rotation);
        if (cancelled || !textRef.current) return;
        setRuns(pieces);
        paintTextLayer(textRef.current, pieces, cssSize);
        page.cleanup();
      } catch (reason) {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : String(reason));
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [doc, pageNumber, scale, rotation]);

  const editingText = edit.tool === 'textEdit';
  const needle = searchQuery.trim().toLowerCase();
  const marks = needle.length === 0 ? [] : runs.filter((run) => run.text.toLowerCase().includes(needle));

  return (
    <Surface
      className="pdf-page"
      onPointerDown={() => {
        annotations.select(null);
        if (edit.tool === 'none') edit.select(null);
      }}
    >
      <canvas ref={canvasRef} className="pdf-page-canvas" aria-label={`Page ${pageNumber}`} />
      <div ref={textRef} className={`pdf-page-text${editingText ? ' is-editing' : ''}`} aria-hidden="true" />
      {marks.map((run, index) => (
        <span
          key={`${index}-${run.left}-${run.top}`}
          className="pdf-search-mark"
          aria-hidden="true"
          style={{
            left: `${run.box.x * 100}%`,
            top: `${run.box.y * 100}%`,
            width: `${run.box.w * 100}%`,
            height: `${run.box.h * 100}%`,
          }}
        />
      ))}
      {/* picking a run to replace uses the run's own box, which is also what the white patch will cover;
          the invisible spans above are a selection layer, not a set of buttons */}
      {editingText && (
        <div className="pdf-run-layer">
          {runs.map((run, index) => (
            <button
              key={`${index}-${run.left}-${run.top}`}
              type="button"
              className="pdf-run"
              title={`Replace “${run.text.trim()}”`}
              aria-label={`Replace ${run.text.trim()}`}
              style={{
                left: `${run.box.x * 100}%`,
                top: `${run.box.y * 100}%`,
                width: `${run.box.w * 100}%`,
                height: `${run.box.h * 100}%`,
              }}
              onClick={(event) => {
                event.stopPropagation();
                edit.editRun(pageNumber, run);
              }}
            />
          ))}
        </div>
      )}
      <EditLayer
        pageNumber={pageNumber}
        items={edit.itemsOn(pageNumber)}
        tool={edit.tool}
        color={edit.color}
        scale={scale}
        pending={edit.pending}
        selectedId={edit.selectedId}
        onCreate={edit.create}
        onUpdateItem={edit.updateItem}
        onRemoveItem={edit.removeItem}
        onEditText={edit.editText}
        onPlace={(box) => edit.placePending(box, pageNumber)}
        onPlaceText={(point) => edit.placeText(point, pageNumber)}
        onSelect={edit.select}
      />
      <AnnotationLayer
        pageNumber={pageNumber}
        items={annotations.byPage.get(pageNumber) ?? []}
        tool={annotations.tool}
        color={annotations.color}
        selectedId={annotations.selectedId}
        onSelect={annotations.select}
        onCreate={(page, box) => void annotations.create(page, box)}
        onNote={(id, note) => void annotations.setNote(id, note)}
        onDrop={(id) => void annotations.drop(id)}
      />
      {error !== null && <p className="pdf-page-error">Page {pageNumber} could not be drawn: {error}</p>}
    </Surface>
  );
}
