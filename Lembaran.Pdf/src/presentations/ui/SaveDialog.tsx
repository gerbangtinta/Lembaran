export interface SaveChoice {
  overwrite: boolean;
}

interface Props {
  /** the file the reader is looking at */
  name: string;
  /** bytes of the file as it is now, for the "was / is" read-out */
  sizeBefore: number;
  /** the original can be written: otherwise the browser asks where to put a copy */
  canOverwrite: boolean;
  busy: boolean;
  error: string | null;
  /** set once a save finished, so the caller can close on the next open */
  result: string | null;
  onClose(): void;
  onSave(choice: SaveChoice): void;
}

/**
 * Saving asks every time and then writes over the file you opened — no options, no second dialog. Choosing what
 * the bytes may lose is the Compress dialog's job; this one asks only "may I replace this file?".
 */
export function SaveDialog({ name, sizeBefore, canOverwrite, busy, error, result, onClose, onSave }: Props) {
  const kb = Math.max(1, Math.round(sizeBefore / 1024)).toLocaleString();

  return (
    <div
      className="pdf-modal"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div className="pdf-modal-panel" role="dialog" aria-modal="true" aria-label="Save PDF">
        <header className="pdf-modal-head">
          <h2>Save PDF</h2>
          <button type="button" className="pdf-ghost" onClick={onClose} disabled={busy}>
            Close
          </button>
        </header>

        <p className="pdf-modal-note">
          {name} · {kb} KB now
        </p>

        {canOverwrite ? (
          <p className="pdf-modal-note">
            Replace <strong>{name}</strong> with the edits baked in. Nothing is re-compressed here — use Compress
            when the file has to be smaller.
          </p>
        ) : (
          <p className="pdf-modal-note">
            This browser cannot write over the file you opened, so it will ask where to put a copy. The original
            stays untouched.
          </p>
        )}

        {error !== null && <p className="pdf-modal-error">{error}</p>}
        {result !== null && <p className="pdf-modal-ok">{result}</p>}

        <div className="pdf-modal-actions">
          <button type="button" className="pdf-ghost" onClick={onClose} disabled={busy}>
            {result !== null ? 'Close' : 'Cancel'}
          </button>
          <button
            type="button"
            className="pdf-primary"
            onClick={() => onSave({ overwrite: canOverwrite })}
            disabled={busy || result !== null}
          >
            {busy ? 'Saving…' : canOverwrite ? 'Save over it' : 'Save a copy'}
          </button>
        </div>
      </div>
    </div>
  );
}
