import { useCallback, useEffect, useRef, useState } from 'react';
import {
  deletePreset,
  listPresets,
  readBlob,
  savePreset,
  type PresetKind,
  type SignaturePreset,
  type StampDesign,
  type StampLine,
} from '../../storage/edits';
import {
  STAMP_COLOURS,
  STAMP_FINISHES,
  defaultStampDesign,
  moveStampLine,
  moveStampLineTo,
  newStampLine,
  paintStamp,
  renderStamp,
  simpleStampDesign,
  stampLabel,
} from '../../feature/stamp/design';
import type { StampFinish } from '../../feature/stamp/design';

/** The picture a reader picked, bytes in hand: the document keeps its own copy of it. */
export interface PresetPick {
  blob: Blob;
  mime: 'image/png' | 'image/jpeg';
  role: 'signature' | 'stamp';
  aspect: number;
  /** a stamp's own width in points: the page places it at the size it was designed at */
  widthPoints?: number;
}

interface Props {
  onCancel(): void;
  /** the picture to place; the caller stores the bytes and arms the page */
  onPick(pick: PresetPick): void;
}

const PAD_WIDTH = 420;
const PAD_HEIGHT = 160;

/** The stamps anyone needs and nobody wants to draw. They are not stored: the chips are always here. */
const STOCK_STAMPS = ['APPROVED', 'REVIEWED', 'DRAFT', 'PAID', 'VOID'];

/** The usual rows of a stamp, as the empty form offers them. */
const ROW_HINTS = ['Heading', 'Name', 'Position', 'Organisation', 'Date or reference'];

async function blobAspect(blob: Blob): Promise<number> {
  try {
    const bitmap = await createImageBitmap(blob);
    const aspect = bitmap.width / Math.max(1, bitmap.height);
    bitmap.close();
    return aspect > 0 ? aspect : 2.6;
  } catch {
    return 2.6;
  }
}

/**
 * Signatures and stamps. A signature is drawn or uploaded once and kept; a stamp is *composed* — lines of text,
 * each bold or not and each sized, inside a paper-stamp frame or a clean digital one — and kept with its design,
 * so it can be reopened and changed instead of being redrawn.
 */
export function SignatureDialog({ onCancel, onPick }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const preview = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const inked = useRef(false);
  const objectUrls = useRef(new Map<string, string>());
  const [kind, setKind] = useState<PresetKind>('signature');
  const [presets, setPresets] = useState<SignaturePreset[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [drawn, setDrawn] = useState(false);
  const [design, setDesign] = useState<StampDesign>(() => defaultStampDesign());
  /** the row being dragged, and the row it would land on */
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropOn, setDropOn] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [keep, setKeep] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearPad = useCallback(() => {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (!element || !context) return;
    context.clearRect(0, 0, element.width, element.height);
    inked.current = false;
    setDrawn(false);
  }, []);

  // the pad belongs to the signature tab: it is reset whenever the shelf changes kind
  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (!element || !context) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    element.width = PAD_WIDTH * dpr;
    element.height = PAD_HEIGHT * dpr;
    context.scale(dpr, dpr);
    context.lineWidth = 2.6;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#111111';
    inked.current = false;
    setDrawn(false);
  }, [kind]);

  // the stamp is drawn as it is typed, and fitted into a window of fixed size: a wide stamp shrinks instead of
  // widening the dialog, and the canvas keeps its shape because the fit is taken from both sides
  useEffect(() => {
    if (kind !== 'stamp') return;
    const element = preview.current;
    if (!element) return;
    const layout = paintStamp(element, design, 2);
    if (!layout) {
      element.style.width = '0px';
      element.style.height = '0px';
      return;
    }
    const box = stage.current;
    const width = box?.clientWidth || 296;
    const height = box?.clientHeight || 220;
    const fit = Math.min(width / layout.width, height / layout.height);
    element.style.width = `${Math.max(1, Math.round(layout.width * fit))}px`;
    element.style.height = `${Math.max(1, Math.round(layout.height * fit))}px`;
  }, [design, kind]);

  const refresh = useCallback(async (which: PresetKind) => {
    const rows = await listPresets(which).catch(() => []);
    const next: Record<string, string> = {};
    for (const row of rows) {
      let url = objectUrls.current.get(row.blobId);
      if (!url) {
        const blob = await readBlob(row.blobId).catch(() => null);
        if (blob) {
          url = URL.createObjectURL(blob);
          objectUrls.current.set(row.blobId, url);
        }
      }
      if (url) next[row.id] = url;
    }
    setPresets(rows);
    setThumbs(next);
  }, []);

  useEffect(() => {
    void refresh(kind);
  }, [kind, refresh]);

  /** Leave with the bytes in hand; the shelf's URLs are this dialog's alone. */
  const finish = (pick: PresetPick) => {
    for (const url of objectUrls.current.values()) URL.revokeObjectURL(url);
    objectUrls.current.clear();
    onPick(pick);
  };

  const cancel = () => {
    for (const url of objectUrls.current.values()) URL.revokeObjectURL(url);
    objectUrls.current.clear();
    onCancel();
  };

  const at = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  };

  const down = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const context = canvas.current?.getContext('2d');
    if (!context) return;
    drawing.current = true;
    inked.current = true;
    setDrawn(true);
    const point = at(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // a synthetic or already-released pointer still draws, it just stops following outside the pad
    }
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const context = canvas.current?.getContext('2d');
    if (!context) return;
    const point = at(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const up = () => {
    drawing.current = false;
  };

  const useDrawn = async () => {
    const element = canvas.current;
    if (!element || !inked.current) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await new Promise<Blob | null>((resolve) => element.toBlob((value) => resolve(value), 'image/png'));
      if (!blob) throw new Error('The drawing could not be read.');
      await savePreset({
        kind: 'signature',
        label: `Signature ${presets.length + 1}`,
        blob,
        mime: 'image/png',
        aspect: PAD_WIDTH / PAD_HEIGHT,
      });
      finish({ blob, mime: 'image/png', role: 'signature', aspect: PAD_WIDTH / PAD_HEIGHT });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      setBusy(false);
    }
  };

  const useUpload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const mime = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
      const aspect = await blobAspect(file);
      await savePreset({ kind, label: `${kind === 'signature' ? 'Signature' : 'Stamp'} ${presets.length + 1}`, blob: file, mime, aspect });
      finish({ blob: file, mime, role: kind, aspect });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      setBusy(false);
    }
  };

  const placeStamp = async (which: StampDesign = design, remember: boolean = keep) => {
    setBusy(true);
    setError(null);
    try {
      const rendered = await renderStamp(which);
      if (!rendered) throw new Error('Fill in at least one line of the stamp.');
      if (remember) {
        await savePreset({
          id: editingId ?? undefined,
          kind: 'stamp',
          label: stampLabel(which),
          blob: rendered.blob,
          mime: 'image/png',
          aspect: rendered.aspect,
          design: which,
        });
      }
      finish({
        blob: rendered.blob,
        mime: 'image/png',
        role: 'stamp',
        aspect: rendered.aspect,
        widthPoints: rendered.width,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      setBusy(false);
    }
  };

  const pickPreset = async (preset: SignaturePreset) => {
    setBusy(true);
    setError(null);
    if (preset.kind === 'stamp' && preset.design) {
      // a saved stamp is stamped again from its settings, so the picture is always freshly drawn
      const rendered = await renderStamp(preset.design);
      if (rendered) {
        finish({
          blob: rendered.blob,
          mime: 'image/png',
          role: 'stamp',
          aspect: rendered.aspect,
          widthPoints: rendered.width,
        });
        return;
      }
    }
    const blob = await readBlob(preset.blobId).catch(() => null);
    if (!blob) {
      setError('That picture is no longer in the store.');
      setBusy(false);
      return;
    }
    finish({ blob, mime: preset.mime, role: preset.kind, aspect: preset.aspect });
  };

  const remove = async (preset: SignaturePreset) => {
    await deletePreset(preset.id).catch(() => undefined);
    const url = objectUrls.current.get(preset.blobId);
    if (url) {
      URL.revokeObjectURL(url);
      objectUrls.current.delete(preset.blobId);
    }
    if (editingId === preset.id) setEditingId(null);
    await refresh(kind);
  };

  const patchLine = (id: string, patch: Partial<StampLine>) => {
    setDesign((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    }));
  };

  return (
    <div
      className="pdf-modal"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) cancel();
      }}
    >
      <div className="pdf-modal-panel is-wide" role="dialog" aria-modal="true" aria-label="Signature or stamp">
        <header className="pdf-modal-head">
          <h2>Signature or stamp</h2>
          <button type="button" className="pdf-ghost" onClick={cancel}>
            Close
          </button>
        </header>

        <div className="pdf-tabs" role="tablist" aria-label="What to place">
          {(['signature', 'stamp'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={kind === value}
              className={`pdf-tab${kind === value ? ' is-on' : ''}`}
              onClick={() => setKind(value)}
            >
              {value === 'signature' ? 'Signature' : 'Stamp'}
            </button>
          ))}
        </div>

        {presets.length > 0 && (
          <div className="pdf-preset-grid" aria-label={`Saved ${kind}s`}>
            {presets.map((preset) => (
              <div key={preset.id} className="pdf-preset">
                <button
                  type="button"
                  className="pdf-preset-pick"
                  title={`Place ${preset.label}`}
                  onClick={() => void pickPreset(preset)}
                  disabled={busy}
                >
                  {thumbs[preset.id] ? (
                    <img src={thumbs[preset.id]} alt={preset.label} />
                  ) : (
                    <span>{preset.label}</span>
                  )}
                </button>
                {preset.kind === 'stamp' && preset.design && (
                  <button
                    type="button"
                    className="pdf-preset-edit"
                    aria-label={`Change ${preset.label}`}
                    title={`Change ${preset.label}`}
                    onClick={() => {
                      setDesign(preset.design ?? defaultStampDesign());
                      setEditingId(preset.id);
                      setKeep(true);
                    }}
                  >
                    ✎
                  </button>
                )}
                <button
                  type="button"
                  className="pdf-preset-del"
                  aria-label={`Delete ${preset.label}`}
                  title={`Delete ${preset.label}`}
                  onClick={() => void remove(preset)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {kind === 'stamp' ? (
          <>
            <div className="pdf-stamp-chips" aria-label="Stock stamps">
              {STOCK_STAMPS.map((text) => (
                <button
                  key={text}
                  type="button"
                  className="pdf-chip"
                  onClick={() => void placeStamp(simpleStampDesign(text), false)}
                  disabled={busy}
                >
                  {text}
                </button>
              ))}
            </div>

            <div className="pdf-stamp-builder">
              <div className="pdf-stamp-form">
                <div className="pdf-stamp-row">
                  <label className="pdf-check pdf-check-sub">
                    <span>Style</span>
                    <select
                      value={design.style}
                      onChange={(event) => setDesign({ ...design, style: event.target.value as StampDesign['style'] })}
                    >
                      <option value="paper">Paper stamp</option>
                      <option value="digital">Digital</option>
                      <option value="plain">Plain text</option>
                    </select>
                  </label>
                  <label className="pdf-check pdf-check-sub">
                    <span>Size</span>
                    <select
                      value={design.size}
                      onChange={(event) => setDesign({ ...design, size: event.target.value as StampDesign['size'] })}
                    >
                      <option value="sm">Small</option>
                      <option value="md">Medium</option>
                      <option value="lg">Large</option>
                    </select>
                  </label>
                  <label className="pdf-check pdf-check-sub">
                    <span>Finish</span>
                    <select
                      value={design.finish ?? 'perfect'}
                      onChange={(event) =>
                        setDesign({ ...design, finish: event.target.value as StampFinish })
                      }
                    >
                      {STAMP_FINISHES.map((finish) => (
                        <option key={finish.value} value={finish.value}>
                          {finish.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="pdf-check pdf-check-sub">
                    <span>Frame</span>
                    <select
                      value={design.border}
                      onChange={(event) => setDesign({ ...design, border: event.target.value as StampDesign['border'] })}
                      disabled={design.style === 'plain'}
                    >
                      <option value="double">Double</option>
                      <option value="single">Single</option>
                      <option value="none">None</option>
                    </select>
                  </label>
                </div>

                <div className="pdf-stamp-row">
                  <span className="pdf-stamp-legend">Ink</span>
                  {STAMP_COLOURS.map((colour) => (
                    <button
                      key={colour.value}
                      type="button"
                      className={`pdf-ink${design.colour === colour.value ? ' is-on' : ''}`}
                      style={{ background: colour.value }}
                      aria-label={`${colour.name} ink`}
                      aria-pressed={design.colour === colour.value}
                      onClick={() => setDesign({ ...design, colour: colour.value })}
                    />
                  ))}
                  <label className="pdf-check pdf-check-sub">
                    <input
                      type="checkbox"
                      checked={design.uppercase}
                      onChange={(event) => setDesign({ ...design, uppercase: event.target.checked })}
                    />
                    Capitals
                  </label>
                  <label className="pdf-check pdf-check-sub">
                    <span>Align</span>
                    <select
                      value={design.align}
                      onChange={(event) => setDesign({ ...design, align: event.target.value as StampDesign['align'] })}
                    >
                      <option value="center">Centre</option>
                      <option value="left">Left</option>
                    </select>
                  </label>
                </div>

                <div className="pdf-stamp-lines">
                  {design.lines.map((line, index) => (
                    <div
                      className={`pdf-stamp-line${dragging === line.id ? ' is-dragging' : ''}${dropOn === line.id ? ' is-drop' : ''}`}
                      key={line.id}
                      onDragOver={(event) => {
                        if (dragging === null || dragging === line.id) return;
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                        setDropOn(line.id);
                      }}
                      onDragLeave={() => setDropOn((current) => (current === line.id ? null : current))}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (dragging !== null && dragging !== line.id) {
                          setDesign((current) => ({
                            ...current,
                            lines: moveStampLineTo(current.lines, dragging, line.id),
                          }));
                        }
                        setDragging(null);
                        setDropOn(null);
                      }}
                    >
                      <span
                        className="pdf-row-grip"
                        role="button"
                        tabIndex={0}
                        draggable
                        aria-label={`Reorder row ${index + 1}`}
                        title="Drag to move this row, or press the arrow keys"
                        onDragStart={(event) => {
                          // only the grip starts a drag: the row holds a text field whose selection must keep working
                          event.dataTransfer.effectAllowed = 'move';
                          event.dataTransfer.setData('text/plain', line.id);
                          setDragging(line.id);
                        }}
                        onDragEnd={() => {
                          setDragging(null);
                          setDropOn(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
                          event.preventDefault();
                          const delta = event.key === 'ArrowUp' ? -1 : 1;
                          setDesign((current) => ({
                            ...current,
                            lines: moveStampLine(current.lines, line.id, delta),
                          }));
                        }}
                      >
                        ⠿
                      </span>
                      <input
                        className="pdf-field"
                        value={line.text}
                        placeholder={ROW_HINTS[index] ?? 'Another row'}
                        aria-label={`Row ${index + 1}`}
                        onChange={(event) => patchLine(line.id, { text: event.target.value })}
                      />
                      <button
                        type="button"
                        className={`pdf-line-b${line.bold ? ' is-on' : ''}`}
                        aria-label={`Bold row ${index + 1}`}
                        aria-pressed={line.bold}
                        onClick={() => patchLine(line.id, { bold: !line.bold })}
                      >
                        B
                      </button>
                      <select
                        className="pdf-line-size"
                        aria-label={`Size of row ${index + 1}`}
                        value={line.size}
                        onChange={(event) => patchLine(line.id, { size: event.target.value as StampLine['size'] })}
                      >
                        <option value="sm">S</option>
                        <option value="md">M</option>
                        <option value="lg">L</option>
                      </select>
                      <button
                        type="button"
                        className="pdf-line-del"
                        aria-label={`Remove row ${index + 1}`}
                        onClick={() =>
                          setDesign((current) => ({
                            ...current,
                            lines: current.lines.filter((entry) => entry.id !== line.id),
                          }))
                        }
                        disabled={design.lines.length <= 1}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pdf-text-row">
                  <button
                    type="button"
                    className="pdf-ghost"
                    onClick={() => setDesign({ ...design, lines: [...design.lines, newStampLine()] })}
                  >
                    + Add a row
                  </button>
                  <button
                    type="button"
                    className="pdf-ghost"
                    onClick={() => {
                      setDesign(defaultStampDesign());
                      setEditingId(null);
                    }}
                  >
                    Start again
                  </button>
                  {editingId !== null && <span className="pdf-modal-note">Changing a saved stamp.</span>}
                </div>
              </div>

              <div className="pdf-stamp-preview">
                <span className="pdf-stamp-legend">Preview</span>
                <div className="pdf-stamp-stage" ref={stage}>
                  <canvas ref={preview} aria-label="Stamp preview" />
                </div>
              </div>
            </div>

            <div className="pdf-text-row">
              <label className="pdf-check pdf-check-sub">
                <input type="checkbox" checked={keep} onChange={(event) => setKeep(event.target.checked)} />
                Keep it on the shelf
              </label>
              <button type="button" className="pdf-primary" onClick={() => void placeStamp()} disabled={busy}>
                {editingId !== null ? 'Save and place' : 'Place the stamp'}
              </button>
              <label className={`pdf-ghost pdf-file-button${busy ? ' is-busy' : ''}`}>
                Upload a picture
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void useUpload(file);
                  }}
                />
              </label>
            </div>
          </>
        ) : (
          <>
            <p className="pdf-modal-note">
              Draw a signature with the pointer, or upload a picture of it. What you make here is kept, so the next
              document can pick it again.
            </p>

            <canvas
              ref={canvas}
              className="pdf-signature-pad"
              style={{ width: `${PAD_WIDTH}px`, maxWidth: '100%', height: `${PAD_HEIGHT}px` }}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
              onPointerLeave={up}
              aria-label="Draw your signature"
            />

            <div className="pdf-text-row">
              <button type="button" className="pdf-ghost" onClick={clearPad} disabled={!drawn || busy}>
                Clear
              </button>
              <button type="button" className="pdf-primary" onClick={() => void useDrawn()} disabled={!drawn || busy}>
                Save and use this signature
              </button>
              <label className={`pdf-ghost pdf-file-button${busy ? ' is-busy' : ''}`}>
                Upload an image
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void useUpload(file);
                  }}
                />
              </label>
            </div>
          </>
        )}

        {busy && <p className="pdf-modal-note">Saving…</p>}
        {error !== null && <p className="pdf-modal-error">{error}</p>}

        <div className="pdf-modal-actions">
          <button type="button" className="pdf-ghost" onClick={cancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
