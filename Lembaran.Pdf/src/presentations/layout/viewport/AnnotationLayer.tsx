import { useEffect, useRef, useState } from 'react';
import type { AnnotateTool, Annotation, AnnotationColor } from '../../../feature/annotate';

interface Props {
  pageNumber: number;
  items: readonly Annotation[];
  tool: AnnotateTool;
  color: AnnotationColor;
  selectedId: string | null;
  onSelect(id: string | null): void;
  onCreate(page: number, box: { x: number; y: number; w: number; h: number }): void;
  onNote(id: string, note: string): void;
  onDrop(id: string): void;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MIN_SIDE = 0.004;

/**
 * Highlights drawn over a page. Rects are normalised to the page box, so they stay
 * put at any zoom or width. Drag with the highlighter tool to add one.
 */
export function AnnotationLayer({
  pageNumber,
  items,
  tool,
  color,
  selectedId,
  onSelect,
  onCreate,
  onNote,
  onDrop,
}: Props) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ start: { x: number; y: number }; current: { x: number; y: number } } | null>(null);
  const annotating = tool === 'highlight';

  const pointOf = (event: React.PointerEvent): { x: number; y: number } => {
    const box = layerRef.current?.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) return { x: 0, y: 0 };
    return {
      x: Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)),
      y: Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)),
    };
  };

  const rectFromDrag = (): Rect | null => {
    if (!drag) return null;
    const x = Math.min(drag.start.x, drag.current.x);
    const y = Math.min(drag.start.y, drag.current.y);
    const w = Math.abs(drag.current.x - drag.start.x);
    const h = Math.abs(drag.current.y - drag.start.y);
    if (w < MIN_SIDE || h < MIN_SIDE) return null;
    return { x, y, w, h };
  };

  const preview = rectFromDrag();

  return (
    <div
      ref={layerRef}
      className={`pdf-annotations${annotating ? ' is-annotating' : ''}`}
      onPointerDown={(event) => {
        if (!annotating) {
          if (event.target === layerRef.current) onSelect(null);
          return;
        }
        event.preventDefault();
        layerRef.current?.setPointerCapture(event.pointerId);
        const point = pointOf(event);
        setDrag({ start: point, current: point });
      }}
      onPointerMove={(event) => {
        if (!drag) return;
        setDrag({ start: drag.start, current: pointOf(event) });
      }}
      onPointerUp={(event) => {
        if (!drag) return;
        const rect = rectFromDrag();
        setDrag(null);
        layerRef.current?.releasePointerCapture(event.pointerId);
        if (rect) onCreate(pageNumber, rect);
      }}
      onPointerCancel={() => setDrag(null)}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`pdf-highlight is-${item.color}${item.id === selectedId ? ' is-selected' : ''}${annotating ? ' is-inert' : ''}`}
          style={{
            left: `${item.x * 100}%`,
            top: `${item.y * 100}%`,
            width: `${item.w * 100}%`,
            height: `${item.h * 100}%`,
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onSelect(item.id === selectedId ? null : item.id);
          }}
          aria-label={item.note.trim().length > 0 ? item.note : `Highlight on page ${item.page}`}
        />
      ))}

      {preview && (
        <div
          className={`pdf-highlight is-${color} is-preview`}
          style={{
            left: `${preview.x * 100}%`,
            top: `${preview.y * 100}%`,
            width: `${preview.w * 100}%`,
            height: `${preview.h * 100}%`,
          }}
        />
      )}

      {items
        .filter((item) => item.id === selectedId)
        .map((item) => (
          <NoteCard
            key={item.id}
            item={item}
            onNote={(note) => onNote(item.id, note)}
            onDrop={() => onDrop(item.id)}
            onClose={() => onSelect(null)}
          />
        ))}
    </div>
  );
}

interface NoteProps {
  item: Annotation;
  onNote(note: string): void;
  onDrop(): void;
  onClose(): void;
}

function NoteCard({ item, onNote, onDrop, onClose }: NoteProps) {
  const [draft, setDraft] = useState(item.note);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(item.note);
    areaRef.current?.focus();
  }, [item.id, item.note]);

  return (
    <div
      className="pdf-note"
      style={{ left: `${Math.min(item.x, 0.55) * 100}%`, top: `${(item.y + item.h) * 100}%` }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <header>
        <span>Note · page {item.page}</span>
        <button type="button" onClick={onClose} aria-label="Close note">
          ✕
        </button>
      </header>
      <textarea
        ref={areaRef}
        value={draft}
        placeholder="What did you notice here?"
        rows={3}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => onNote(draft)}
      />
      <footer>
        <button type="button" className="is-danger" onClick={onDrop}>
          Delete
        </button>
        <button
          type="button"
          onClick={() => {
            onNote(draft);
            onClose();
          }}
        >
          Done
        </button>
      </footer>
    </div>
  );
}
