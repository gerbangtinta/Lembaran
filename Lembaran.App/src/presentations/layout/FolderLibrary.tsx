import { useEffect, useState } from 'react';
import { folderView, type FolderFile } from '@lembaran/framework';
import type { BoundFolderApi } from '../../feature/folder';
import { useFolderPath } from '../../feature/folder';
import { CountChip } from '../component/CountChip';
import { ExpandIcon, SwapFolderIcon, UnlinkIcon } from '../component/icons';
import { FolderBrowser } from './FolderBrowser';
import { FolderOverlay } from './FolderOverlay';

interface Props {
  folder: BoundFolderApi;
  /** the shell's search term; the browser turns it into tree-wide results */
  query: string;
  onOpen(entry: FolderFile): void;
}

/**
 * The bound folder in the page: icon actions, a breadcrumb, then one level of files in a box that scrolls
 * after ten rows. Expand opens the same browser over 90% of the window, with a flat "All files" mode
 * beside it. The count chip explains itself on hover: how many folders, and how many of each kind.
 */
export function FolderLibrary({ folder, query, onOpen }: Props) {
  const { state, folder: bound, canBind } = folder;
  const files = folder.files;
  const [confirmingForget, setConfirmingForget] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // a different folder, or a listing that no longer holds the open folder, starts at the top
  const rootKey = `${bound?.name ?? ''}:${files.length}`;
  const { path, navigate } = useFolderPath(rootKey);
  useEffect(() => {
    setExpanded(false);
  }, [rootKey]);

  if (state === 'loading') {
    return <p className="hub-note">Reading the folder…</p>;
  }

  if (state === 'needs-permission') {
    return (
      <div className="hub-invite">
        <div>
          <h3>{bound ? `Reconnect ${bound.name}` : 'Reconnect the folder'}</h3>
          <p>
            The browser asked again after the restart. One click restores the listing — nothing was
            uploaded, moved or changed.
          </p>
        </div>
        <div className="hub-invite-actions">
          <button type="button" className="lb-primary" onClick={() => void folder.reconnect()}>
            Reconnect
          </button>
          <button type="button" className="lb-ghost" onClick={() => void folder.bind()}>
            Pick another
          </button>
        </div>
      </div>
    );
  }

  if (state === 'empty' || (state === 'transient' && files.length === 0)) {
    return (
      <div className="hub-invite">
        <div>
          <h3>Bind a folder</h3>
          <p>
            {canBind
              ? 'Pick a folder once. Lembaran remembers it, lists every readable file inside — subfolders too — and opens them from here, next session as well.'
              : 'This browser cannot keep a folder between visits, so a picked folder is listed until you reload.'}
          </p>
        </div>
        <button type="button" className="lb-primary" onClick={() => void folder.bind()}>
          {canBind ? 'Choose folder' : 'Pick a folder'}
        </button>
      </div>
    );
  }

  const title = bound?.name ?? 'Picked folder';
  const here = folderView(files, path);

  return (
    <>
      <div className="hub-folder-head">
        <span className="hub-folder-name">{title}</span>
        <CountChip files={files} />
        {state === 'transient' && <span className="hub-flag">not remembered after a reload</span>}

        <div className="hub-folder-actions">
          <button
            type="button"
            className="hub-icon-btn"
            onClick={() => setExpanded(true)}
            title="Expand"
            aria-label="Expand the folder into a larger window"
          >
            <ExpandIcon />
          </button>
          <button
            type="button"
            className="hub-icon-btn"
            onClick={() => void folder.bind()}
            title="Change folder"
            aria-label="Change folder"
          >
            <SwapFolderIcon />
          </button>
          {bound &&
            (confirmingForget ? (
              <span className="hub-confirm" role="group" aria-label="Forget this folder?">
                <span>Forget it?</span>
                <button
                  type="button"
                  className="hub-confirm-yes"
                  onClick={() => {
                    setConfirmingForget(false);
                    void folder.release();
                  }}
                >
                  Forget
                </button>
                <button
                  type="button"
                  className="lb-ghost"
                  onClick={() => setConfirmingForget(false)}
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="hub-icon-btn"
                onClick={() => setConfirmingForget(true)}
                title="Unbind"
                aria-label="Unbind this folder"
              >
                <UnlinkIcon />
              </button>
            ))}
        </div>
      </div>

      <FolderBrowser
        files={files}
        path={path}
        rootName={title}
        query={query}
        onNavigate={navigate}
        onOpen={onOpen}
      />

      {here.files.length + here.folders.length > 0 && (
        <p className="hub-note hub-note-tight">
          {here.folders.length > 0 &&
            `${here.folders.length} folder${here.folders.length === 1 ? '' : 's'} · `}
          {here.files.length} file{here.files.length === 1 ? '' : 's'}
        </p>
      )}

      {expanded && (
        <FolderOverlay
          title={title}
          files={files}
          path={path}
          onNavigate={navigate}
          onOpen={onOpen}
          onClose={() => setExpanded(false)}
        />
      )}
    </>
  );
}
