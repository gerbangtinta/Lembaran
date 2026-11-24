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
  /** the drive moved on: the save stopped and is waiting for a decision */
  conflict: boolean;
  onSaveAnyway(): void;
  onTakeDriveCopy(): void;
  onClose(): void;
  onSave(choice: SaveChoice): void;
  /** hand the same document to the Compress window instead of writing it as it is */
  onCompress?(): void;
}

/**
 * Saving asks every time and then writes over the file you opened — no options, no second dialog. Choosing what
 * the bytes may lose is the Compress dialog's job; this one asks only "may I replace this file?".
 */
export function SaveDialog({
  name,
  sizeBefore,
  canOverwrite,
  busy,
  error,
  result,
  conflict,
  onSaveAnyway,
  onTakeDriveCopy,
  onClose,
  onSave,
  onCompress,
}: Props) {
  const kb = Math.max(1, Math.round(sizeBefore / 1024)).toLocaleString();
  /** a whole-file write is what costs time and bytes; past a few megabytes it is worth saying so */
  const heavy = sizeBefore >= 4 * 1024 * 1024;

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

        {conflict ? (
          <p className="pdf-modal-note">
            <strong>The copy in OneDrive changed since you opened it.</strong> Nothing has been written. Keep this
            window's edits and replace that copy, or open the newer one — which throws these edits away.
          </p>
        ) : canOverwrite ? (
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

        {heavy && !conflict && result === null && onCompress && (
          <div className="pdf-modal-note pdf-modal-heavy">
            <span>
              A save writes <strong>the whole file</strong> ({kb} KB or more), so on a slow or metered connection it
              is the upload that takes the time.
            </span>
            <button type="button" className="pdf-ghost" onClick={onCompress} disabled={busy}>
              Compress first
            </button>
          </div>
        )}

        {conflict ? (
          <div className="pdf-modal-actions">
            <button type="button" className="pdf-ghost" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="pdf-ghost" onClick={onTakeDriveCopy} disabled={busy}>
              Open theirs
            </button>
            <button type="button" className="pdf-primary" onClick={onSaveAnyway} disabled={busy}>
              {busy ? 'Saving…' : 'Replace it'}
            </button>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
