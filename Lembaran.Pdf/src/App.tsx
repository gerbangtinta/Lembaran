import { useCallback, useEffect, useRef, useState } from 'react';
import type { DocumentSource } from '@lembaran/framework';
import { onZoomRequest, useIsMobile } from '@lembaran/ui';
import { useAnnotations } from './feature/annotate';
import { A4, sourceToDisplay, usePdfEdits } from './feature/edit';
import { bakePdf, canOverwrite, writePdf, type SaveOutcome } from './feature/save';
import type { SaveChoice } from './presentations/ui/SaveDialog';
import { SaveDialog } from './presentations/ui/SaveDialog';
import { CompressDialog, type CompressChoice } from './presentations/ui/CompressDialog';
import { putBlob, readBlob } from './storage/edits';
import type { EditSurface } from './presentations/layout/viewport/PageCanvas';
import type { EditTool, ItemBox } from './presentations/layout/viewport/EditLayer';
import { TextDialog, type TextSubmission } from './presentations/ui/TextDialog';
import { SignatureDialog, type PresetPick } from './presentations/ui/SignatureDialog';
import type { EditItem, TextItem } from './storage/edits';
import type { TextPiece } from './feature/open';
import { rekeyAnnotations } from './storage/annotations';
import { useFullscreen } from '@lembaran/ui';
import { openFromDisk, usePdfDocument } from './feature/open';
import { exportDocumentText, searchDocument, useSearch } from './feature/search';
import { useShortcuts } from './feature/shortcuts';
import { nextZoom, previousZoom } from './feature/zoom';
import type { PdfReaderApi } from './state/api';
import { documentKey, loadSourceBytes } from './state/document';
import { EmptyState } from '@lembaran/ui';
import { PdfShell, type ShellProps } from './presentations/layout/PdfShell';
import type { PdfViewportApi } from './presentations/layout/viewport/PdfViewport';
import { PdfMobileShell } from './presentations/mobile/PdfMobileShell';

/** What the text window is open for: a new box, a placed one, or a run of the page's own text. */
type TextTarget =
  | { kind: 'new'; point: { x: number; y: number }; source: number }
  | { kind: 'item'; item: TextItem }
  | { kind: 'run'; run: TextPiece; source: number };

/** A picture in the store, waiting for the click that says where it goes. */
interface Armable {
  blobId: string;
  mime: 'image/png' | 'image/jpeg';
  role: 'image' | 'signature' | 'stamp';
  /** width ÷ height of the picture */
  aspect: number;
  /** the share of the page width it lands at */
  width: number;
}

const clamp01 = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));

const IMAGE_WIDTH = 0.4;
const SIGNATURE_WIDTH = 0.3;
const STAMP_WIDTH = 0.34;

async function pictureAspect(blob: Blob): Promise<number> {
  try {
    const bitmap = await createImageBitmap(blob);
    const aspect = bitmap.width / Math.max(1, bitmap.height);
    bitmap.close();
    return aspect > 0 ? aspect : 1;
  } catch {
    return 1;
  }
}

interface Props {
  source?: DocumentSource | null;
  assetBase: string;
  apiRef?: { current: PdfReaderApi | null };
}

export function PdfApp({ source = null, assetBase, apiRef }: Props) {
  const [current, setCurrent] = useState<DocumentSource | null>(source);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [opening, setOpening] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [railOpen, setRailOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<string | null>(null);
  /** the original can be written: false means the browser will be asked where to put a copy */
  const [saveOver, setSaveOver] = useState(false);
  /** compress works on the file with every edit baked in, which is made once when its window opens */
  const [compressOpen, setCompressOpen] = useState(false);
  const [baked, setBaked] = useState<Uint8Array | null>(null);
  /** a sentence for the status line after a save, the way a tool left armed says what to do next */
  const [notice, setNotice] = useState<string | null>(null);
  const [editTool, setEditTool] = useState<EditTool>('none');
  /** the text window: a new box, an existing one, or a run of the page being covered */
  const [textTarget, setTextTarget] = useState<TextTarget | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [signatureOpen, setSignatureOpen] = useState(false);
  /** a picture already stored and waiting for the click that decides where it lands */
  const [pending, setPending] = useState<Armable | null>(null);

  const viewportApi = useRef<PdfViewportApi | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const mobile = useIsMobile();
  const { doc, loading, error } = usePdfDocument(bytes, assetBase);
  const search = useSearch(doc);
  const annotations = useAnnotations(documentKey(current));
  const edits = usePdfEdits(documentKey(current), doc?.numPages ?? 0);
  const fullscreen = useFullscreen(rootRef);

  useEffect(() => {
    if (!current) {
      setBytes(null);
      return;
    }
    let cancelled = false;
    loadSourceBytes(current)
      .then((loaded) => {
        if (!cancelled) setBytes(loaded);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setLocalError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      cancelled = true;
    };
  }, [current]);

  useEffect(() => {
    if (!doc) return;
    setPage((value) => Math.min(value, doc.numPages));
    setRailOpen(!matchMedia('(max-width: 900px)').matches);
  }, [doc]);

  // Showing or hiding the rail changes the width the page is fitted to.
  useEffect(() => {
    viewportApi.current?.refit();
  }, [railOpen]);

  const open = useCallback(async () => {
    setOpening(true);
    setLocalError(null);
    try {
      const opened = await openFromDisk();
      if (!opened) return;
      setZoom(1);
      setPage(1);
      setSearchOpen(false);
      search.clear();
      setPending(null);
      setSelectedItem(null);
      setTextTarget(null);
      setEditTool('none');
      setCurrent({ kind: 'bytes', bytes: opened.bytes, name: opened.name, mime: 'application/pdf' });
    } catch (reason) {
      setLocalError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setOpening(false);
    }
  }, []);

  const numPages = edits.pages.length || 1;

  const goTo = useCallback(
    (next: number) => {
      const target = Math.min(numPages, Math.max(1, Math.round(next)));
      viewportApi.current?.goToPage(target);
    },
    [numPages],
  );

  // the sequence can shrink under the reader: keep the position inside what still exists
  useEffect(() => {
    setPage((value) => Math.min(value, Math.max(1, edits.pages.length)));
  }, [edits.pages.length]);

  const currentSource = edits.pages[page - 1]?.source ?? null;
  const rotatePage = useCallback(
    (delta: 90 | -90) => {
      if (currentSource !== null) edits.rotatePage(currentSource, delta);
    },
    [currentSource, edits],
  );
  /** Remove the page at a display position: a source page from the order, or a blank from the record. */
  const deleteAt = useCallback(
    (display: number) => {
      const entry = edits.pages[display - 1];
      if (!entry) return;
      if (entry.source === null) {
        if (entry.blankId) edits.removeBlankPage(entry.blankId);
      } else {
        edits.deletePage(entry.source);
      }
    },
    [edits],
  );
  const deletePage = useCallback(() => deleteAt(page), [deleteAt, page]);
  const insertBlankPage = useCallback(
    (display?: number) => {
      // the rail names a card; the toolbar means the page the reader is on
      const position = typeof display === 'number' ? display : page;
      // `at` counts source pages, so a blank dropped after a blank still lands right below the card
      const before = edits.pages.slice(0, position).filter((entry) => entry.source !== null).length;
      // the blank is the same paper as the page it follows: an A4 document gets A4, a Letter one gets Letter
      const size = viewportApi.current?.pageBox(position) ?? A4;
      edits.insertBlankPage(before, size);
    },
    [edits, page],
  );

  const zoomIn = useCallback(() => setZoom((value) => nextZoom(value)), []);
  const zoomOut = useCallback(() => setZoom((value) => previousZoom(value)), []);

  // Ctrl + wheel re-renders the page at the new raster scale, instead of scaling the canvas and blurring it
  useEffect(() => onZoomRequest((direction) => (direction === 1 ? zoomIn() : zoomOut())), [zoomIn, zoomOut]);

  const [fitMode, setFitMode] = useState<'width' | 'height'>('width');
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      const key = event.key.toLowerCase();
      if (key !== 'z' && key !== 'y') return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      event.preventDefault();
      if (key === 'y' || event.shiftKey) edits.redo();
      else edits.undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [edits]);

  const fit = useCallback(
    () => (fitMode === 'width' ? viewportApi.current?.fitWidth() : viewportApi.current?.fitHeight()),
    [fitMode],
  );
  const toggleFitMode = useCallback(() => {
    setFitMode((current) => {
      const next = current === 'width' ? 'height' : 'width';
      if (next === 'width') viewportApi.current?.fitWidth();
      else viewportApi.current?.fitHeight();
      return next;
    });
  }, []);

  /** The picture goes into the store now and waits for the click that decides where it lands. */
  const armPicture = useCallback(
    async (blob: Blob, mime: 'image/png' | 'image/jpeg', role: Armable['role'], aspect: number, width: number) => {
      const id = `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      try {
        await putBlob(id, blob, mime);
      } catch {
        return;
      }
      setEditTool('none');
      setSelectedItem(null);
      setPending({ blobId: id, mime, role, aspect, width });
    },
    [],
  );

  const pickSignature = useCallback(
    (pick: PresetPick) => {
      setSignatureOpen(false);
      // a composed stamp knows its size in points; the page places it at that size rather than a guessed share
      const box = viewportApi.current?.pageBox(page);
      const width =
        pick.widthPoints !== undefined && box && box.width > 0
          ? clamp01(pick.widthPoints / box.width, 0.12, 0.9)
          : pick.role === 'signature'
            ? SIGNATURE_WIDTH
            : STAMP_WIDTH;
      void armPicture(pick.blob, pick.mime, pick.role, pick.aspect, width);
    },
    [armPicture, page],
  );

  // the image tool asks for the file at once, then the page is armed for the click that places it
  const placeImageNow = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      void pictureAspect(file).then((aspect) => armPicture(file, mime, 'image', aspect, IMAGE_WIDTH));
    });
    input.click();
  }, [armPicture]);

  const placePending = useCallback(
    (box: ItemBox, source: number) => {
      if (!pending) return;
      const created = edits.addItem({
        kind: 'image',
        role: pending.role,
        page: source,
        blobId: pending.blobId,
        mime: pending.mime,
        ...box,
      });
      setPending(null);
      setSelectedItem(created?.id ?? null);
    },
    [edits, pending],
  );

  const removeItem = useCallback(
    (id: string) => {
      edits.removeItem(id);
      setSelectedItem((current) => (current === id ? null : current));
    },
    [edits],
  );

  // Delete takes the picked item — or the picked note — away; a field with the focus keeps its own Delete
  const selectedNote = annotations.selectedId;
  useEffect(() => {
    if (!selectedItem && !selectedNote) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      const target = event.target as HTMLElement | null;
      if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)) return;
      event.preventDefault();
      if (selectedItem) removeItem(selectedItem);
      else if (selectedNote) void annotations.drop(selectedNote);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [annotations, removeItem, selectedItem, selectedNote]);

  const submitText = useCallback(
    (target: TextTarget, value: TextSubmission) => {
      if (target.kind === 'new') {
        const created = edits.addItem({
          kind: 'text',
          page: target.source,
          x: clamp01(target.point.x, 0, 0.8),
          y: clamp01(target.point.y, 0, 0.9),
          w: 0.5,
          h: 0.16,
          text: value.text,
          size: value.size,
          align: value.align,
          color: value.color,
          background: value.background ? 'white' : undefined,
        });
        setSelectedItem(created?.id ?? null);
      } else if (target.kind === 'item') {
        edits.updateItem(target.item.id, {
          text: value.text,
          size: value.size,
          align: value.align,
          color: value.color,
          background: value.background ? 'white' : 'none',
        });
      } else {
        // cover-and-replace: the run's own box hides the old words, and the new ones are recorded over it
        const run = target.run;
        const created = edits.addItem({
          kind: 'text',
          page: target.source,
          x: clamp01(run.box.x, 0, 0.95),
          y: clamp01(run.box.y, 0, 0.97),
          w: clamp01(run.box.w, 0.05, 1),
          h: clamp01(run.box.h, 0.03, 1),
          text: value.text,
          size: value.size,
          align: value.align,
          color: value.color,
          background: 'white',
          replaced: run.text,
        });
        setSelectedItem(created?.id ?? null);
      }
      setTextTarget(null);
      setEditTool('none');
    },
    [edits],
  );
  const applyFit = useCallback((next: number) => setZoom(next), []);
  /** closing find forgets the term: the marks on the paper belong to the search, not to the page */
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    search.clear();
  }, [search]);
  const toggleSearch = useCallback(() => {
    if (searchOpen) closeSearch();
    else setSearchOpen(true);
  }, [closeSearch, searchOpen]);
  const toggleAnnotate = useCallback(
    () => annotations.setTool(annotations.tool === 'highlight' ? 'none' : 'highlight'),
    [annotations],
  );

  useShortcuts({
    nextPage: () => goTo(page + 1),
    previousPage: () => goTo(page - 1),
    zoomIn,
    zoomOut,
    fitWidth: fit,
    toggleSearch,
    toggleAnnotate,
    toggleInk: () => {
      setPending(null);
      setTextTarget(null);
      setEditTool((current) => (current === 'ink' ? 'none' : 'ink'));
    },
    finishTool: () => {
      setPending(null);
      setTextTarget(null);
      setEditTool('none');
    },
    toggleFullscreen: fullscreen.toggle,
    save: () => void openSave(),
    closeOverlays: () => {
      closeSearch();
      annotations.select(null);
      annotations.setTool('none');
      setPending(null);
      setSelectedItem(null);
      setEditTool('none');
    },
  });

  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      goToPage: (next) => goTo(next),
      search: (query) => (doc ? searchDocument(doc, query) : Promise.resolve([])),
      exportText: () => (doc ? exportDocumentText(doc) : Promise.resolve('')),
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, doc, goTo]);

  const editSurface: EditSurface = {
    // an armed picture takes the page: the next click is where it goes, not a stroke
    tool: pending ? 'place' : editTool,
    color: '#c0392b',
    selectedId: selectedItem,
    pending: pending ? { aspect: pending.aspect, width: pending.width } : null,
    itemsOn: edits.itemsOnPage,
    create: edits.addItem,
    updateItem: (id, box) => edits.updateItem(id, box),
    removeItem,
    editText: (item) => setTextTarget({ kind: 'item', item }),
    editRun: (source, run) => setTextTarget({ kind: 'run', run, source }),
    placePending,
    placeText: (point, source) => setTextTarget({ kind: 'new', point, source }),
    select: setSelectedItem,
  };

  /** What the writer wants: the record's items plus the notes that still live in their own table. */
  const collectItems = useCallback(async () => {
    // the highlights still live in their own table: they ride along as items of the same record
    const highlights: EditItem[] = annotations.all
      .filter((item) => !item.baked)
      .map((item) => ({
        id: `h${item.id}`,
        kind: 'highlight',
        page: item.page,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        color: item.color,
      }));

    const images = new Map<string, { bytes: Uint8Array; mime: string }>();
    for (const item of edits.items) {
      if (item.kind !== 'image' || images.has(item.blobId)) continue;
      const stored = await readBlob(item.blobId).catch(() => null);
      if (stored) images.set(item.blobId, { bytes: new Uint8Array(await stored.arrayBuffer()), mime: stored.type || 'image/png' });
    }
    return { items: [...edits.items, ...highlights], images };
  }, [annotations.all, edits.items]);

  const bakeRecord = useCallback(async (): Promise<Uint8Array> => {
    if (!bytes) throw new Error('There is no document to write.');
    const { items, images } = await collectItems();
    return bakePdf({ bytes, plan: edits.plan, items, images });
  }, [bytes, collectItems, edits.plan]);

  /** A message under the pages for a few seconds: what a save did belongs there, not in a window left open. */
  const announce = useCallback((text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice((shown) => (shown === text ? null : shown)), 8000);
  }, []);

  /** After bytes are written: the record is empty, and a file saved over itself is what the reader reads next. */
  const settleSave = useCallback(
    async (outcome: SaveOutcome) => {
      if (!current) return;
      if (outcome.path !== null) {
        const before = documentKey(current);
        const next: DocumentSource = { kind: 'opfs', path: outcome.path, name: current.name, mime: 'application/pdf' };
        await rekeyAnnotations(before, documentKey(next)).catch(() => undefined);
        setCurrent(next);
        setPage(1);
      }
      edits.clear();
      setSelectedItem(null);
      setPending(null);
    },
    [current, edits],
  );

  /** Save asks every time — that is the whole of it — and then writes over the file. */
  const openSave = useCallback(async () => {
    if (!current || !bytes) return;
    setSaveError(null);
    setSaveResult(null);
    setSaveOver(await canOverwrite(current.kind === 'opfs' ? current.path : '').catch(() => false));
    setSaveOpen(true);
  }, [bytes, current]);

  const saveNow = useCallback(
    async (choice: SaveChoice) => {
      if (!current) return;
      setSaving(true);
      setSaveError(null);
      setSaveResult(null);
      try {
        const output = await bakeRecord();
        const outcome = await writePdf({
          bytes: output,
          target: { path: current.kind === 'opfs' ? current.path : '', name: current.name, mime: 'application/pdf' },
          overwrite: choice.overwrite,
        });
        await settleSave(outcome);
        const size = Math.round(outcome.size / 1024).toLocaleString();
        setSaveResult(
          outcome.kind === 'copy'
            ? `Saved a copy: ${size} KB. The file you opened is untouched.`
            : `Saved over the original: ${size} KB.`,
        );
        announce(outcome.kind === 'copy' ? `Saved a copy · ${size} KB` : `Saved over ${current.name} · ${size} KB`);
      } catch (reason) {
        setSaveError(reason instanceof Error ? reason.message : String(reason));
      } finally {
        setSaving(false);
      }
    },
    [announce, bakeRecord, current, settleSave],
  );

  /** Compress is its own window: it needs the baked file before it can try a pass, so it is made here. */
  const openCompress = useCallback(async () => {
    if (!current || !bytes) return;
    setSaveError(null);
    setSaving(true);
    try {
      setBaked(await bakeRecord());
      setSaveOver(await canOverwrite(current.kind === 'opfs' ? current.path : '').catch(() => false));
      setCompressOpen(true);
    } catch (reason) {
      announce(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setSaving(false);
    }
  }, [announce, bakeRecord, bytes, current]);

  const saveCompressed = useCallback(
    async (choice: CompressChoice) => {
      if (!current) return;
      setSaving(true);
      setSaveError(null);
      try {
        const outcome = await writePdf({
          bytes: choice.bytes,
          target: { path: current.kind === 'opfs' ? current.path : '', name: current.name, mime: 'application/pdf' },
          overwrite: choice.overwrite,
        });
        await settleSave(outcome);
        setCompressOpen(false);
        const size = Math.round(outcome.size / 1024).toLocaleString();
        const where = outcome.kind === 'copy' ? 'Compressed copy saved' : `Compressed over ${current.name}`;
        announce(`${where} · ${size} KB · ${choice.note}`);
      } catch (reason) {
        setSaveError(reason instanceof Error ? reason.message : String(reason));
      } finally {
        setSaving(false);
      }
    },
    [announce, current, settleSave],
  );

  if (!current) {
    return (
      <div className="lb-root" ref={rootRef}>
        <EmptyState
          title="Lembaran PDF"
          body="Read a PDF in the browser. Nothing is uploaded — the file stays on this device."
          action={{ label: 'Open a PDF', onClick: () => void open(), busy: opening }}
        />
      </div>
    );
  }

  const failure = localError ?? error;
  if (failure !== null) {
    return (
      <div className="lb-root" ref={rootRef}>
        <EmptyState
          tone="error"
          title="Could not open this document"
          body={failure}
          action={{ label: 'Try another file', onClick: () => void open() }}
        />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="pdf-loading">
        <span className="pdf-spinner" aria-hidden="true" />
        {loading ? `Opening ${current.name}…` : 'Preparing…'}
      </div>
    );
  }

  const shellProps: ShellProps = {
    doc,
    title: current.name,
    pages: edits.pages,
    displayOf: (source) => sourceToDisplay(edits.pages, source) + 1 || 1,
    canDeletePage: edits.pages.length > 1,
    edit: editSurface,
    editTool: pending ? 'none' : editTool,
    onEditTool: (tool) => {
      setPending(null);
      setTextTarget(null);
      setEditTool(tool);
    },
    dirty: edits.dirty,
    onMovePage: (from, to) => {
      // the rail speaks display positions, the plan speaks source pages: a blank between two pages makes
      // the two numbers differ, so drop the blanks before handing the index over
      const sourceIndex = (display: number) =>
        edits.pages.slice(0, Math.max(0, display - 1)).filter((entry) => entry.source !== null).length;
      const last = edits.plan.order.length - 1;
      edits.movePage(sourceIndex(from), Math.min(last, sourceIndex(to)));
    },
    onRotatePageAt: (display, delta) => {
      const source = edits.pages[display - 1]?.source ?? null;
      if (source !== null) edits.rotatePage(source, delta);
    },
    onDeletePageAt: deleteAt,
    canUndo: edits.canUndo,
    canRedo: edits.canRedo,
    onUndo: edits.undo,
    onRedo: edits.redo,
    fitMode,
    onToggleFitMode: toggleFitMode,
    onPlaceImage: placeImageNow,
    onPlaceSignature: () => {
      setPending(null);
      setEditTool('none');
      setSignatureOpen(true);
    },
    onEditText: () => {
      setPending(null);
      setTextTarget(null);
      setEditTool((current) => (current === 'textEdit' ? 'none' : 'textEdit'));
    },
    placingRole: pending?.role ?? null,
    hint:
      notice ??
      (pending !== null
        ? 'Click the page to place it · Enter or Esc finishes'
        : editTool === 'ink'
          ? 'Draw with the pointer · Enter or Esc puts the pen down'
          : editTool === 'text'
            ? 'Click the page to put the text box there · Enter or Esc finishes'
            : editTool === 'textEdit'
              ? 'Click the words to replace them · Enter or Esc finishes'
              : annotations.tool === 'highlight'
                ? 'Drag across the page to highlight · H or Esc finishes'
                : undefined),
    onSave: () => void openSave(),
    onCompress: () => void openCompress(),
    canOverwrite: saveOver,
    onRotatePage: rotatePage,
    onDeletePage: deletePage,
    onInsertBlankPage: insertBlankPage,
    page,
    zoom,
    busy: opening,
    search,
    annotations,
    fullscreen,
    viewportApi,
    rootRef,
    railOpen,
    searchOpen,
    onToggleRail: () => setRailOpen((value) => !value),
    onToggleSearch: toggleSearch,
    onGoTo: goTo,
    onPageChange: setPage,
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    onFit: fit,
    onFitScale: applyFit,
    onOpen: () => void open(),
  };

  return (
    <>
      {mobile ? <PdfMobileShell {...shellProps} /> : <PdfShell {...shellProps} />}
      {textTarget !== null && (
        <TextDialog
          mode={textTarget.kind === 'new' ? 'new' : textTarget.kind === 'item' ? 'placed' : 'run'}
          initial={
            textTarget.kind === 'new' ? '' : textTarget.kind === 'item' ? textTarget.item.text : textTarget.run.text
          }
          size={
            textTarget.kind === 'new'
              ? 16
              : textTarget.kind === 'item'
                ? textTarget.item.size
                : Math.max(6, Math.round(textTarget.run.points))
          }
          align={textTarget.kind === 'item' ? textTarget.item.align : 'left'}
          color={textTarget.kind === 'item' ? textTarget.item.color : '#111111'}
          background={
            textTarget.kind === 'run'
              ? true
              : textTarget.kind === 'item'
                ? textTarget.item.background === 'white'
                : false
          }
          onCancel={() => setTextTarget(null)}
          onSubmit={(value) => submitText(textTarget, value)}
        />
      )}
      {signatureOpen && <SignatureDialog onCancel={() => setSignatureOpen(false)} onPick={pickSignature} />}
      {saveOpen && (
        <SaveDialog
          name={current.name}
          sizeBefore={bytes?.byteLength ?? 0}
          canOverwrite={saveOver}
          busy={saving}
          error={saveError}
          result={saveResult}
          onClose={() => setSaveOpen(false)}
          onSave={(choice) => void saveNow(choice)}
        />
      )}
      {compressOpen && baked !== null && (
        <CompressDialog
          name={current.name}
          baked={baked}
          canOverwrite={saveOver}
          busy={saving}
          error={saveError}
          onClose={() => {
            setCompressOpen(false);
            setSaveError(null);
          }}
          onSave={(choice) => void saveCompressed(choice)}
        />
      )}
    </>
  );
}
