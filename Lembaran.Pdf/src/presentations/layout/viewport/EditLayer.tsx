import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { EditItem, ImageItem, InkItem, NewEditItem, TextItem } from '../../../storage/edits';
import { readBlob } from '../../../storage/edits';

export type EditTool = 'none' | 'highlight' | 'ink' | 'text' | 'textEdit' | 'place';

/** A picture armed for placement: its shape, and the share of the page width it lands at. */
export interface PendingPlacement {
  aspect: number;
  width: number;
}

/** A normalised box on the page — what an item is and what a drag produces. */
export interface ItemBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

type GestureMode = 'move' | 'nw' | 'ne' | 'sw' | 'se';

interface Props {
  /** the source page this layer sits on: items are recorded against source pages, not positions */
  pageNumber: number;
  items: readonly EditItem[];
  tool: EditTool;
  color: string;
  /** the page's raster scale: an item's size is recorded in points, so what is drawn here matches the file */
  scale: number;
  /** an image, signature or stamp waiting for a click */
  pending: PendingPlacement | null;
  onCreate(item: NewEditItem): void;
  onUpdateItem(id: string, box: ItemBox): void;
  onRemoveItem(id: string): void;
  onEditText(item: TextItem): void;
  onPlace(box: ItemBox): void;
  onPlaceText(point: { x: number; y: number }): void;
  onSelect(id: string | null): void;
  selectedId: string | null;
}

const STROKE = 2;
const MIN_SIDE = 0.03;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/**
 * The box a gesture produces. A dragged corner moves the two edges it owns; a picture keeps the shape it landed
 * with, so a signature is never stretched, while a text box may be made any rectangle.
 */
function gestureBox(
  box: ItemBox,
  mode: Exclude<GestureMode, 'move'>,
  dx: number,
  dy: number,
  keepAspect: boolean,
): ItemBox {
  const east = mode === 'ne' || mode === 'se';
  const south = mode === 'se' || mode === 'sw';
  if (keepAspect) {
    const ratio = box.w / box.h;
    let width = east ? box.w + dx : box.w - dx;
    const maxWidth = east ? 1 - box.x : box.x + box.w;
    const maxHeight = south ? 1 - box.y : box.y + box.h;
    let height = width / ratio;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * ratio;
    }
    if (width > maxWidth) {
      width = maxWidth;
      height = width / ratio;
    }
    width = Math.max(MIN_SIDE, width);
    height = Math.max(MIN_SIDE, height);
    return {
      x: east ? box.x : box.x + box.w - width,
      y: south ? box.y : box.y + box.h - height,
      w: width,
      h: height,
    };
  }
  let left = box.x;
  let top = box.y;
  let right = box.x + box.w;
  let bottom = box.y + box.h;
  if (east) right = clamp(box.x + box.w + dx, left + MIN_SIDE, 1);
  else left = clamp(box.x + dx, 0, right - MIN_SIDE);
  if (south) bottom = clamp(box.y + box.h + dy, top + MIN_SIDE, 1);
  else top = clamp(box.y + dy, 0, bottom - MIN_SIDE);
  return { x: left, y: top, w: right - left, h: bottom - top };
}

/**
 * The layer that holds what the record invented for this page: ink being drawn, text boxes, placed images and
 * highlights. Everything is normalised, so a page's items survive a zoom, a rotation or a resize unchanged.
 */
export function EditLayer({
  pageNumber,
  items,
  tool,
  color,
  scale,
  pending,
  onCreate,
  onUpdateItem,
  onRemoveItem,
  onEditText,
  onPlace,
  onPlaceText,
  onSelect,
  selectedId,
}: Props) {
  const layer = useRef<HTMLDivElement>(null);
  const [stroke, setStroke] = useState<Array<{ x: number; y: number }> | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  /** one object URL per blob, kept for as long as the page is drawn */
  const objectUrls = useRef(new Map<string, string>());
  /** the box being dragged or resized, painted over the recorded one until the pointer comes up */
  const [draft, setDraft] = useState<{ id: string; box: ItemBox } | null>(null);
  const draftRef = useRef<{ id: string; box: ItemBox } | null>(null);
  const gesture = useRef<{ id: string; mode: GestureMode; start: { x: number; y: number }; box: ItemBox } | null>(null);
  /** takes the window listeners of a drag away, including when the page goes while a finger is down */
  const stopGesture = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      stopGesture.current?.();
    },
    [],
  );

  const keepDraft = (value: { id: string; box: ItemBox } | null) => {
    draftRef.current = value;
    setDraft(value);
  };

  // images are stored as bytes: a URL per blob, made once and lived with, so adding an item does not
  // revoke the picture that was already on the page
  useEffect(() => {
    const missing = items.filter(
      (item): item is ImageItem => item.kind === 'image' && !objectUrls.current.has(item.blobId),
    );
    if (missing.length === 0) return;
    let cancelled = false;
    void Promise.all(
      missing.map(async (item) => {
        const blob = await readBlob(item.blobId).catch(() => null);
        if (!blob) return null;
        const url = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return null;
        }
        objectUrls.current.set(item.blobId, url);
        return item.blobId;
      }),
    ).then((ids) => {
      if (cancelled || !ids.some((id) => id !== null)) return;
      setUrls(Object.fromEntries(objectUrls.current));
    });
    return () => {
      cancelled = true;
    };
  }, [items]);

  // the page takes its pictures with it
  useEffect(
    () => () => {
      for (const url of objectUrls.current.values()) URL.revokeObjectURL(url);
      objectUrls.current.clear();
    },
    [],
  );

  const point = (event: ReactPointerEvent): { x: number; y: number } | null => {
    const box = layer.current?.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) return null;
    return {
      x: Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)),
      y: Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)),
    };
  };

  /** Drag the item, or one of its corners, and commit the box once the pointer is released. */
  const beginGesture = (event: ReactPointerEvent, item: TextItem | ImageItem, mode: GestureMode) => {
    if (tool !== 'none') return;
    const box = layer.current?.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) return;
    stopGesture.current?.();
    event.preventDefault();
    event.stopPropagation();
    onSelect(item.id);
    const start = point(event);
    if (!start) return;
    gesture.current = {
      id: item.id,
      mode,
      start,
      box: { x: item.x, y: item.y, w: item.w, h: item.h },
    };
    const keepAspect = item.kind === 'image';

    const onMove = (moveEvent: PointerEvent) => {
      const active = gesture.current;
      const rect = layer.current?.getBoundingClientRect();
      if (!active || !rect || rect.width === 0 || rect.height === 0) return;
      const dx = (moveEvent.clientX - rect.left) / rect.width - active.start.x;
      const dy = (moveEvent.clientY - rect.top) / rect.height - active.start.y;
      const box = active.box;
      const next =
        active.mode === 'move'
          ? {
              ...box,
              x: clamp(box.x + dx, 0, 1 - box.w),
              y: clamp(box.y + dy, 0, 1 - box.h),
            }
          : gestureBox(box, active.mode, dx, dy, keepAspect);
      keepDraft({ id: active.id, box: next });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      stopGesture.current = null;
      const active = gesture.current;
      const finished = draftRef.current;
      gesture.current = null;
      keepDraft(null);
      // a click is not a move: only a box that actually changed deserves a place in the undo history
      if (active && finished && finished.id === active.id) {
        const moved =
          Math.abs(finished.box.x - active.box.x) > 1e-6 ||
          Math.abs(finished.box.y - active.box.y) > 1e-6 ||
          Math.abs(finished.box.w - active.box.w) > 1e-6 ||
          Math.abs(finished.box.h - active.box.h) > 1e-6;
        if (moved) onUpdateItem(active.id, finished.box);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    stopGesture.current = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      gesture.current = null;
      keepDraft(null);
    };
  };

  const onPointerDown = (event: ReactPointerEvent) => {
    if (tool === 'none') {
      onSelect(null);
      return;
    }
    const at = point(event);
    if (!at) return;
    if (tool === 'text') {
      onPlaceText(at);
      return;
    }
    if (tool === 'place') {
      const rect = layer.current?.getBoundingClientRect();
      if (!pending || !rect || rect.width === 0 || rect.height === 0) return;
      const width = Math.min(1, pending.width);
      // the picture keeps its own shape: its height follows the page's own width ÷ height
      const height = Math.min(1, (width * (rect.width / rect.height)) / Math.max(0.01, pending.aspect));
      onPlace({
        x: clamp(at.x - width / 2, 0, 1 - width),
        y: clamp(at.y - height / 2, 0, 1 - height),
        w: width,
        h: height,
      });
      return;
    }
    // a pointer that is already gone (or a synthetic one) must not take the stroke down with it
    try {
      layer.current?.setPointerCapture(event.pointerId);
    } catch {
      // drawing still works without the capture; it only stops following outside the page
    }
    setStroke([at]);
  };

  const onPointerMove = (event: ReactPointerEvent) => {
    if (!stroke) return;
    const at = point(event);
    if (!at) return;
    setStroke((current) => (current ? [...current, at] : current));
  };

  const finish = (event: ReactPointerEvent) => {
    if (!stroke) return;
    try {
      layer.current?.releasePointerCapture(event.pointerId);
    } catch {
      // nothing was captured
    }
    // a single tap is a dot: give it a second point so it survives the round trip through the writer
    const points = stroke.length === 1 && stroke[0] ? [stroke[0], { x: stroke[0].x + 0.0005, y: stroke[0].y }] : stroke;
    onCreate({ kind: 'ink', page: pageNumber, points, color, width: STROKE } satisfies Omit<InkItem, 'id'>);
    setStroke(null);
  };

  const drawing = tool === 'ink';
  const placing = tool === 'text' || tool === 'place';

  return (
    <div
      ref={layer}
      className={`pdf-edit-layer${drawing ? ' is-drawing' : ''}${placing ? ' is-placing' : ''}${tool === 'none' ? ' is-idle' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={() => setStroke(null)}
    >
      {items.map((item) => {
        if (item.kind === 'ink') return <Ink key={item.id} item={item} scale={scale} selected={item.id === selectedId} />;
        if (item.kind !== 'text' && item.kind !== 'image') return null;
        const box = draft?.id === item.id ? draft.box : item;
        const selected = item.id === selectedId;
        const cover = item.kind === 'text' && (item.replaced !== undefined || item.background === 'white');
        const url = item.kind === 'image' ? urls[item.blobId] : undefined;
        if (item.kind === 'image' && !url) return null;
        return (
          <div
            key={item.id}
            className={`pdf-edit-item is-${item.kind}${selected ? ' is-selected' : ''}${cover ? ' has-cover' : ''}`}
            style={{
              left: `${box.x * 100}%`,
              top: `${box.y * 100}%`,
              width: `${box.w * 100}%`,
              height: `${box.h * 100}%`,
            }}
            title={cover ? `Covers the run: ${item.replaced ?? ''}` : undefined}
            onPointerDown={(event) => beginGesture(event, item, 'move')}
            onDoubleClick={(event) => {
              if (item.kind !== 'text') return;
              event.stopPropagation();
              onEditText(item);
            }}
          >
            {item.kind === 'text' ? (
              <span
                className="pdf-edit-text"
                style={{ fontSize: `${item.size * scale}px`, color: item.color, textAlign: item.align }}
              >
                {item.text}
              </span>
            ) : (
              <img className="pdf-edit-image" src={url} alt="" draggable={false} />
            )}
            {selected && tool === 'none' && (
              <>
                {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
                  <span
                    key={corner}
                    className={`pdf-edit-handle is-${corner}`}
                    onPointerDown={(event) => beginGesture(event, item, corner)}
                  />
                ))}
                <button
                  type="button"
                  className="pdf-edit-remove"
                  aria-label="Remove this item"
                  title="Remove (Delete)"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemoveItem(item.id);
                  }}
                >
                  ×
                </button>
              </>
            )}
          </div>
        );
      })}

      {stroke !== null && (
        <svg className="pdf-edit-stroke" viewBox="0 0 1 1" preserveAspectRatio="none">
          <polyline
            points={stroke.map((entry) => `${entry.x},${entry.y}`).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth={STROKE * scale}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}

/**
 * A recorded stroke. The width is a point count in the file, so it is multiplied by the page's scale: the
 * stroke must be as thick on screen as it will be in the bytes, at any zoom.
 */
function Ink({ item, scale, selected }: { item: InkItem; scale: number; selected: boolean }) {
  return (
    <svg className={`pdf-edit-ink${selected ? ' is-selected' : ''}`} viewBox="0 0 1 1" preserveAspectRatio="none">
      <polyline
        points={item.points.map((entry) => `${entry.x},${entry.y}`).join(' ')}
        fill="none"
        stroke={item.color}
        strokeWidth={item.width * scale}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
