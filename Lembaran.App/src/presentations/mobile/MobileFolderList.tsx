import { useState } from 'react';
import type { FolderFile } from '@lembaran/framework';
import type { BoundFolderApi } from '../../feature/folder';
import { useFolderPath } from '../../feature/folder';
import { CountChip } from '../component/CountChip';
import { SwapFolderIcon, UnlinkIcon } from '../component/icons';
import { MobileFolderBrowser } from './MobileFolderBrowser';

interface Props {
  folder: BoundFolderApi;
  query: string;
  onOpen(entry: FolderFile): void;
}

/** The bound folder on a phone: icon actions and one level of files, in its own tab. */
export function MobileFolderList({ folder, query, onOpen }: Props) {
  const { state, folder: bound, canBind } = folder;
  const files = folder.files;
  const [confirmingForget, setConfirmingForget] = useState(false);

  const rootKey = `${bound?.name ?? ''}:${files.length}`;
  const { path, navigate } = useFolderPath(rootKey);

  if (state === 'loading') {
    return <p className="hub-note">Reading the folder…</p>;
  }

  if (state === 'needs-permission') {
    return (
      <div className="hub-invite">
        <h3>{bound ? `Reconnect ${bound.name}` : 'Reconnect the folder'}</h3>
        <p>The browser needs your permission again after the restart.</p>
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
        <h3>Bind a folder</h3>
        <p>
          {canBind
            ? 'Pick a folder once and its files stay listed here, subfolders and all — this session and the next.'
            : 'This browser cannot keep a folder between visits; the listing lasts until you reload.'}
        </p>
        <button type="button" className="lb-primary" onClick={() => void folder.bind()}>
          {canBind ? 'Choose folder' : 'Pick a folder'}
        </button>
      </div>
    );
  }

  const title = bound?.name ?? 'Picked folder';

  return (
    <div className="hub-folder-pane">
      <div className="hub-folder-head">
        <span className="hub-folder-name">{title}</span>
        <CountChip files={files} />
        <div className="hub-folder-actions">
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
              <>
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
              </>
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
      {confirmingForget && <p className="hub-flag">Forget this folder? Its files are not touched.</p>}
      {state === 'transient' && <p className="hub-flag">Not remembered after a reload.</p>}

      <MobileFolderBrowser
        files={files}
        path={path}
        rootName={title}
        query={query}
        onNavigate={navigate}
        onOpen={onOpen}
      />
    </div>
  );
}
