import { useCallback, useState } from 'react';
import {
  COMPRESS_PRESETS,
  TARGET_LADDER,
  compress,
  fitToSize,
  type CompressLevel,
  type CompressOutcome,
} from '../../feature/compress';

export interface CompressChoice {
  /** the bytes to write, already compressed */
  bytes: Uint8Array;
  overwrite: boolean;
  /** a sentence for the status line: what was given up to get there */
  note: string;
}

interface Props {
  name: string;
  /** the document with every edit baked in: what is compressed and what is written */
  baked: Uint8Array;
  canOverwrite: boolean;
  busy: boolean;
  error: string | null;
  onClose(): void;
  onSave(choice: CompressChoice): void;
}

type Mode = 'preset' | 'size' | 'manual';

const QUALITIES = [
  { value: 0.92, label: 'Barely touched (92%)' },
  { value: 0.85, label: 'Light (85%)' },
  { value: 0.72, label: 'Balanced (72%)' },
  { value: 0.6, label: 'Small (60%)' },
  { value: 0.45, label: 'Smallest (45%)' },
];

const EDGES = [2400, 1800, 1600, 1200, 800];

const kb = (bytes: number) => Math.max(1, Math.round(bytes / 1024)).toLocaleString();
const share = (after: number, before: number) =>
  before > 0 ? Math.max(0, Math.round((1 - after / before) * 100)) : 0;

/**
 * Compress, apart from Save. Three ways in: a preset, a target size, or every dial by hand — and the weight on each
 * side of the file (photos, and the structure that carries text and vectors) is set separately. Text is never
 * rasterised, so the smallest a file can go is the size of its own words; when a target cannot be met the dialog
 * says what it did reach instead of pretending.
 */
export function CompressDialog({ name, baked, canOverwrite, busy, error, onClose, onSave }: Props) {
  const [mode, setMode] = useState<Mode>('preset');
  const [level, setLevel] = useState<CompressLevel>('medium');
  const [targetKb, setTargetKb] = useState(() => Math.max(20, Math.round((baked.byteLength / 1024) * 0.6)));
  const [quality, setQuality] = useState(0.72);
  const [maxEdge, setMaxEdge] = useState(1800);
  const [structure, setStructure] = useState(true);
  const [images, setImages] = useState(true);
  const [overwrite, setOverwrite] = useState(canOverwrite);
  const [outcome, setOutcome] = useState<CompressOutcome | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  /** Runs the chosen mode. Returns the bytes, so Save can use a run that was not checked first. */
  const run = useCallback(async (): Promise<{ outcome: CompressOutcome; note: string }> => {
    if (mode === 'size') {
      const target = Math.max(10, targetKb) * 1024;
      const fitted = await fitToSize(TARGET_LADDER, target, (step) =>
        compress(baked, { structure: true, images: true, quality: step.quality, maxEdge: step.maxEdge }),
      );
      return {
        outcome: fitted.outcome,
        note: fitted.met
          ? `Fits ${kb(target)} KB: photos at ${Math.round(fitted.step.quality * 100)}%, at most ${fitted.step.maxEdge} px.`
          : `The smallest it would go is ${kb(fitted.outcome.after)} KB — the rest is the document's own text and lines, which are never turned into pictures.`,
      };
    }
    if (mode === 'preset') {
      const step = COMPRESS_PRESETS[level].step;
      const result = await compress(baked, { structure: true, images: true, quality: step.quality, maxEdge: step.maxEdge });
      return {
        outcome: result,
        note: `${COMPRESS_PRESETS[level].label}: photos at ${Math.round(step.quality * 100)}%, at most ${step.maxEdge} px.`,
      };
    }
    const result = await compress(baked, { structure, images, quality, maxEdge });
    return {
      outcome: result,
      note: images
        ? `Photos at ${Math.round(quality * 100)}%, at most ${maxEdge} px${structure ? ', structure packed' : ''}.`
        : `${structure ? 'Structure packed' : 'Nothing changed'} — photos left exactly as they are.`,
    };
  }, [baked, images, level, maxEdge, mode, quality, structure, targetKb]);

  const check = async () => {
    setChecking(true);
    setLocalError(null);
    setNote(null);
    try {
      const result = await run();
      setOutcome(result.outcome);
      setNote(result.note);
    } catch (reason) {
      setLocalError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setChecking(false);
    }
  };

  const save = async () => {
    setLocalError(null);
    try {
      const result = outcome ? { outcome, note: note ?? '' } : await run();
      if (!outcome) {
        setOutcome(result.outcome);
        setNote(result.note);
      }
      onSave({ bytes: result.outcome.bytes, overwrite, note: result.note });
    } catch (reason) {
      setLocalError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  const shown = outcome ?? { before: baked.byteLength, after: baked.byteLength, images: null };
  const report = shown.images;

  return (
    <div
      className="pdf-modal"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div className="pdf-modal-panel" role="dialog" aria-modal="true" aria-label="Compress PDF">
        <header className="pdf-modal-head">
          <h2>Compress</h2>
          <button type="button" className="pdf-ghost" onClick={onClose} disabled={busy}>
            Close
          </button>
        </header>

        <p className="pdf-modal-note">
          {name} · {kb(baked.byteLength)} KB with your edits
        </p>

        <label className="pdf-check pdf-check-sub">
          <span>How much say do you want</span>
          <select value={mode} onChange={(event) => { setMode(event.target.value as Mode); setOutcome(null); setNote(null); }}>
            <option value="preset">A preset</option>
            <option value="size">Fit a final size</option>
            <option value="manual">Set it myself</option>
          </select>
        </label>

        {mode === 'preset' && (
          <div className="pdf-chip-row" role="group" aria-label="Compression preset">
            {(Object.keys(COMPRESS_PRESETS) as CompressLevel[]).map((value) => (
              <button
                key={value}
                type="button"
                className={`pdf-chip${level === value ? ' is-on' : ''}`}
                aria-pressed={level === value}
                onClick={() => { setLevel(value); setOutcome(null); setNote(null); }}
              >
                {COMPRESS_PRESETS[value].label}
              </button>
            ))}
          </div>
        )}

        {mode === 'size' && (
          <label className="pdf-check pdf-check-sub">
            <span>Final size</span>
            <span className="pdf-size-target">
              <input
                type="number"
                min={10}
                step={10}
                value={targetKb}
                aria-label="Final size in kilobytes"
                onChange={(event) => { setTargetKb(Number(event.target.value)); setOutcome(null); setNote(null); }}
              />
              KB
            </span>
          </label>
        )}

        {mode === 'manual' && (
          <>
            <label className="pdf-check">
              <input type="checkbox" checked={images} onChange={(event) => { setImages(event.target.checked); setOutcome(null); }} />
              <span>
                Recompress the photos
                <small>Each image is decoded, shrunk and written back as a smaller JPEG. Never bigger than it was.</small>
              </span>
            </label>
            {images && (
              <>
                <label className="pdf-check pdf-check-sub">
                  <span>Photo quality</span>
                  <select value={quality} onChange={(event) => { setQuality(Number(event.target.value)); setOutcome(null); }}>
                    {QUALITIES.map((entry) => (
                      <option key={entry.value} value={entry.value}>
                        {entry.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="pdf-check pdf-check-sub">
                  <span>Largest photo edge</span>
                  <select value={maxEdge} onChange={(event) => { setMaxEdge(Number(event.target.value)); setOutcome(null); }}>
                    {EDGES.map((edge) => (
                      <option key={edge} value={edge}>
                        {edge} px
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <label className="pdf-check">
              <input type="checkbox" checked={structure} onChange={(event) => { setStructure(event.target.checked); setOutcome(null); }} />
              <span>
                Pack the structure
                <small>Drops what nothing points at and packs the rest. Text and lines are untouched, not redrawn.</small>
              </span>
            </label>
          </>
        )}

        <p className="pdf-modal-hint">Text is never rasterised: a page stays a page, not a picture of one.</p>

        <div className="pdf-size-report" aria-live="polite">
          <strong>
            {kb(shown.before)} KB → {kb(shown.after)} KB
          </strong>
          {outcome ? <span>{share(shown.after, shown.before)}% smaller</span> : <span>not checked yet</span>}
          {report && (
            <span>
              {report.recompressed} photo{report.recompressed === 1 ? '' : 's'} rewritten
              {report.skipped > 0 ? `, ${report.skipped} left as they were` : ''}
            </span>
          )}
        </div>
        {note !== null && <p className="pdf-modal-note">{note}</p>}

        <label className="pdf-check">
          <input type="checkbox" checked={overwrite} onChange={(event) => setOverwrite(event.target.checked)} disabled={!canOverwrite} />
          <span>
            Write it over the original
            <small>{canOverwrite ? 'Uncheck to keep the file and save a copy instead.' : 'This browser can only save a copy, so it will ask where to put it.'}</small>
          </span>
        </label>

        {(localError ?? error) !== null && <p className="pdf-modal-error">{localError ?? error}</p>}

        <div className="pdf-modal-actions">
          <button type="button" className="pdf-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="pdf-ghost" onClick={() => void check()} disabled={busy || checking}>
            {checking ? 'Checking…' : 'Check the size'}
          </button>
          <button type="button" className="pdf-primary" onClick={() => void save()} disabled={busy || checking}>
            {busy ? 'Saving…' : 'Save compressed'}
          </button>
        </div>
      </div>
    </div>
  );
}
