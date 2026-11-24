import { useEffect } from 'react';
import type { FolderFile } from '@lembaran/framework';
import type { BoundFolderApi } from '../../feature/folder';
import { DriveFolder } from '../layout/DriveFolder';

interface Props {
  folder: BoundFolderApi;
  onOpen(entry: FolderFile): void;
}

/**
 * "Which folder?" asked as a window of its own. The drive panel is the same walk either way, but binding is a
 * decision, and doing it in a modal keeps it from looking like the folder is already bound while it is only being
 * chosen — and leaves Cancel somewhere obvious.
 */
export function DrivePickerDialog({ folder, onOpen }: Props) {
  const close = () => folder.cancelDrivePicker();
  const view = folder.driveView;
  const inside = view !== null && view.driveId !== null;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  return (
    <div
      className="hub-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        className="hub-overlay-panel hub-picker-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Choose a OneDrive folder"
      >
        <header className="hub-overlay-head">
          <div>
            <h2 className="lb-label">OneDrive</h2>
            <span className="hub-overlay-title">Choose the folder to bind</span>
          </div>
        </header>
        <div className="hub-overlay-body">
          <p className="hub-note hub-note-tight">
            Pick a drive, step into a folder, then <strong>Use this folder</strong>. The hub lists what is inside it
            and the PDF reader saves back into it; nothing is copied anywhere else.
          </p>
          <DriveFolder folder={folder} onOpen={onOpen} hideBind />
        </div>
        <footer className="hub-picker-foot">
          {view !== null && view.driveId === null && (
            <button
              type="button"
              className="hub-account-action"
              onClick={() => void folder.addAccount()}
              title="Sign in with a different Microsoft account, then choose a folder in it"
            >
              Sign in with another account
            </button>
          )}
          <span className="hub-picker-actions">
            <button type="button" className="lb-ghost" onClick={close}>
              Cancel
            </button>
            <button
              type="button"
              className="lb-primary"
              disabled={!inside}
              onClick={() => void folder.bindHere()}
            >
              Use this folder
            </button>
          </span>
        </footer>
      </div>
    </div>
  );
}
