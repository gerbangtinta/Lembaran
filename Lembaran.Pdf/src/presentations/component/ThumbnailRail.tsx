import { PanelItem, RailThumb, SidePanel, type ThumbPainter } from '@lembaran/ui';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { PDFDocumentProxy } from '../../feature/open';
import type { DisplayPage } from '../../feature/edit';
import { PAGE_ASPECT } from '../../feature/paginate';
import { PageSwitch } from '../ui/PageSwitch';

interface Props {
  doc: PDFDocumentProxy;
  /** the sequence the reader draws, so a deleted page has no card and a blank one has an empty card */
  pages: readonly DisplayPage[];
  /** 1-based display position */
  page: number;
  /** source pages carrying notes, for the dot on the rail */
  marked: ReadonlySet<number>;
  /** width / height of page 1, so every card is the shape of the paper */
  aspect: number;
  onSelect(page: number): void;
  /** reorder: the display position the dragged page was dropped on */
  onMove(from: number, to: number): void;
  onRotate(page: number, delta: 90 | -90): void;
  onInsertBlank(page: number): void;
  onDelete(page: number): void;
  canDelete: boolean;
}

/** Above this many pages the rail paints on demand instead of all at once. */
const EAGER_PAGES = 60;

/** Page rail. Each thumbnail renders only when it is near the rail's viewport. */
export function ThumbnailRail({ doc, pages, page, marked, aspect, onSelect, onMove, onRotate, onInsertBlank, onDelete, canDelete }: Props) {
  const eager = pages.length <= EAGER_PAGES;

  const [menu, setMenu] = useState<{ page: number; x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  // the menu is a popup over the page, not a row in the rail: it is placed where the pointer asked for it and
  // pulled back inside the window — otherwise it takes a card's place and pushes the column down
  useLayoutEffect(() => {
    const element = menuRef.current;
    if (!menu || !element) return;
    const box = element.getBoundingClientRect();
    element.style.left = `${Math.max(6, Math.min(menu.x, window.innerWidth - box.width - 6))}px`;
    element.style.top = `${Math.max(6, Math.min(menu.y, window.innerHeight - box.height - 6))}px`;
  }, [menu]);

  // the menu closes the way menus do: a press anywhere else, or Escape — and that press is spent on closing it,
  // not on selecting the page text under it. A scroll or a resize moves the card away from it, so it closes too.
  useEffect(() => {
    if (menu === null) return;
    const dismiss = (event: Event) => {
      if ((event.target as HTMLElement | null)?.closest('.pdf-rail-menu')) return;
      event.preventDefault();
      event.stopPropagation();
      setMenu(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(null);
    };
    const close = () => setMenu(null);
    document.addEventListener('click', dismiss, true);
    document.addEventListener('keydown', onKey);
    document.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('click', dismiss, true);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [menu]);

  return (
    <SidePanel
      label="Pages"
      footer={<PageSwitch page={page} numPages={pages.length} onGoTo={onSelect} compact />}
    >
      {menu !== null &&
        createPortal(
          <div
            ref={menuRef}
            className="pdf-rail-menu"
            role="menu"
            aria-label={`Page ${menu.page} actions`}
            style={{ left: menu.x, top: menu.y }}
          >
            <span className="pdf-rail-menu-head">Page {menu.page}</span>
            <button type="button" role="menuitem" onClick={() => { onRotate(menu.page, -90); setMenu(null); }}>
              Rotate left
            </button>
            <button type="button" role="menuitem" onClick={() => { onRotate(menu.page, 90); setMenu(null); }}>
              Rotate right
            </button>
            <button type="button" role="menuitem" onClick={() => { onInsertBlank(menu.page); setMenu(null); }}>
              Insert blank after
            </button>
            <button
              type="button"
              role="menuitem"
              className="pdf-menu-danger"
              disabled={!canDelete}
              onClick={() => { onDelete(menu.page); setMenu(null); }}
            >
              Delete page
            </button>
          </div>,
          document.body,
        )}
      {pages.map((entry) => {
        const display = entry.display + 1;
        const turned = entry.rotation === 90 || entry.rotation === 270;
        const cardAspect =
          entry.source === null
            ? (entry.height ?? 1) / (entry.width ?? 1)
            : turned
              ? 1 / aspect
              : aspect;
        return (
          <div
            key={entry.key}
            className={`pdf-rail-item${dragging === display ? ' is-dragging' : ''}`}
            draggable
            onDragStart={() => setDragging(display)}
            onDragEnd={() => setDragging(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragging !== null) onMove(dragging, display);
              setDragging(null);
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              setMenu({ page: display, x: event.clientX, y: event.clientY });
            }}
          >
          <PanelItem
            number={display}
            label={`Page ${display}`}
            current={display === page}
            aspect={cardAspect}
            noted={entry.source !== null && marked.has(entry.source)}
            onSelect={() => onSelect(display)}
          >
            {entry.source === null ? (
              <BlankThumb width={entry.width} height={entry.height} eager={eager} />
            ) : (
              <PageThumb doc={doc} pageNumber={entry.source} rotation={entry.rotation} eager={eager} />
            )}
          </PanelItem>
          </div>
        );
      })}
    </SidePanel>
  );
}

/**
 * A blank page has nothing to paint: the card shows the paper and stops there. It is painted at the blank's own
 * ratio, so a landscape page the record invented does not get a portrait card.
 */
function BlankThumb({ width, height, eager }: { width?: number; height?: number; eager: boolean }) {
  const paint = useCallback<ThumbPainter>(
    async (canvas, cardWidth) => {
      const ratio = width && height ? height / width : PAGE_ASPECT;
      canvas.width = Math.floor(cardWidth);
      canvas.height = Math.round(cardWidth * ratio);
      const context = canvas.getContext('2d');
      if (!context) return;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
    },
    [height, width],
  );
  return <RailThumb paint={paint} eager={eager} />;
}

/** The rail owns the card and the lazy painting; pdf.js draws the pixels. */
function PageThumb({
  doc,
  pageNumber,
  rotation,
  eager,
}: {
  doc: PDFDocumentProxy;
  pageNumber: number;
  rotation: 0 | 90 | 180 | 270;
  eager: boolean;
}) {
  const paint = useCallback(
    async (canvas: HTMLCanvasElement, width: number, signal: AbortSignal) => {
      const page = await doc.getPage(pageNumber);
      if (signal.aborted) {
        page.cleanup();
        return;
      }
      const base = page.getViewport({ scale: 1, rotation });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: (width / base.width) * dpr, rotation });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${width}px`;
      const render = page.render({ canvas, viewport });
      signal.addEventListener('abort', () => render.cancel(), { once: true });
      await render.promise.catch(() => undefined);
      page.cleanup();
    },
    [doc, pageNumber, rotation],
  );

  return <RailThumb paint={paint} eager={eager} />;
}
