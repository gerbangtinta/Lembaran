import { Surface } from '@lembaran/ui';
import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from '../../../feature/open';
import { textPieces } from '../../../feature/open';
import type { AnnotationsState } from '../../../feature/annotate';
import { AnnotationLayer } from './AnnotationLayer';
import { paintTextLayer } from './TextLayer';

interface Props {
  doc: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  annotations: AnnotationsState;
}

/** One page: canvas for the glyphs, an overlaid text layer for selection, highlights above both. */
export function PageCanvas({ doc, pageNumber, scale, annotations }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
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
        const viewport = page.getViewport({ scale: scale * dpr });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${viewport.width / dpr}px`;
        canvas.style.height = `${viewport.height / dpr}px`;

        const task = page.render({ canvas, viewport });
        renderTask = task;
        await task.promise;
        if (cancelled) return;

        const cssSize = { width: viewport.width / dpr, height: viewport.height / dpr };
        const pieces = await textPieces(page, scale);
        if (cancelled || !textRef.current) return;
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
  }, [doc, pageNumber, scale]);

  return (
    <Surface className="pdf-page" onPointerDown={() => annotations.select(null)}>
      <canvas ref={canvasRef} className="pdf-page-canvas" aria-label={`Page ${pageNumber}`} />
      <div ref={textRef} className="pdf-page-text" aria-hidden="true" />
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
