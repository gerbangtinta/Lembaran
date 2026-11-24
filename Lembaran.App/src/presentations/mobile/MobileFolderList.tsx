import { useState } from 'react';
import type { FolderFile } from '@lembaran/framework';
import type { BoundFolderApi } from '../../feature/folder';
import { useFolderPath } from '../../feature/folder';
import { folderSource, SOURCE_LABEL } from '../sources';
import { CountChip } from '../component/CountChip';
import { DrivePickerDialog } from '../component/DrivePickerDialog';
import { OneDriveSetup } from '../component/OneDriveSetup';
import { SwapFolderIcon, UnlinkIcon } from '../component/icons';
import { Loading } from '../component/Loading';
import { DriveFolder } from '../layout/DriveFolder';
import { MobileFolderBrowser } from './MobileFolderBrowser';

interface Props {
  folder: BoundFolderApi;
  query: string;
  onOpen(entry: FolderFile): void;
}

/** The bound folder on a phone: icon actions and one level of files, in its own tab. */
export function MobileFolderList({ folder, query, onOpen }: Props) {
  const { state, folder: bound, canBind, driveFolder, driveView, cloudReady } = folder;
  const files = folder.files;
  const [confirmingForget, setConfirmingForget] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);

  const rootKey = `${bound?.name ?? ''}:${files.length}`;
  const { path, navigate } = useFolderPath(rootKey);

  const source = (
    <>
      {cloudReady ? (
        <button type="button" className="lb-ghost" onClick={() => void folder.chooseDrive()}>
          OneDrive
        </button>
      ) : (
        <button type="button" className="lb-ghost" onClick={() => setSetupOpen(true)}>
          Set up OneDrive
        </button>
      )}
      {setupOpen && (
        <OneDriveSetup
          onClose={() => setSetupOpen(false)}
          onReady={() => {
            setSetupOpen(false);
            void folder.chooseDrive();
          }}
        />
      )}
    </>
  );

  if (state === 'loading' || state === 'drive-signing-in' || (state === 'drive-browsing' && driveView === null)) {
    return state === 'loading' ? (
      <Loading title="Reading the folder" hint="Listing what it holds — subfolders included." />
    ) : state === 'drive-browsing' ? (
      <Loading title="Opening your drives" hint="Asking Microsoft which drives this account can see." />
    ) : (
      <Loading
        title="Signing in to OneDrive"
        hint="Talking to Microsoft. If a sign-in page opens, finish there and this window carries on by itself."
        onCancel={() => folder.cancelSignIn()}
      />
    );
  }

  if (state === 'drive-signed-out' || state === 'drive-expired') {
    return (
      <div className="hub-invite">
        <h3>{state === 'drive-expired' ? 'Sign in to OneDrive again' : 'Connect OneDrive'}</h3>
        <p>
          {driveFolder
            ? `“${driveFolder.name}” is still bound. Signing in again restores the listing.`
            : 'Sign in to list a folder in OneDrive and open what is inside it.'}
        </p>
        <div className="hub-invite-actions">
          <button type="button" className="lb-primary" onClick={() => void folder.signIn()}>
            Sign in
          </button>
          {driveFolder && (
            <button type="button" className="lb-ghost" onClick={() => void folder.release()}>
              Forget the drive
            </button>
          )}
        </div>
      </div>
    );
  }

  // the drive panel is the same panel the hub uses; while a folder is being chosen it gets its own window
  if (driveView !== null) {
    return driveView.choosing ? (
      <DrivePickerDialog folder={folder} onOpen={onOpen} />
    ) : (
      <DriveFolder folder={folder} onOpen={onOpen} />
    );
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
          {source}
        </div>
      </div>
    );
  }

  if (state === 'empty' || (state === 'transient' && files.length === 0)) {
    return (
      <div className="hub-invite">
        <h3>{canBind ? 'Bind a folder' : 'Upload a folder'}</h3>
        <p>
          {canBind
            ? 'Pick a folder once and its files stay listed here, subfolders and all — this session and the next.'
            : 'This browser cannot keep a folder between visits; the listing lasts until you reload.'}
        </p>
        <div className="hub-invite-actions">
          <button type="button" className="lb-primary" onClick={() => void folder.bind()}>
            {canBind ? 'Choose folder' : 'Upload a folder'}
          </button>
          {source}
        </div>
      </div>
    );
  }

  // the heading names the source; the breadcrumb under it names the folder
  const heading = SOURCE_LABEL[folderSource(folder.source)];
  const folderName = bound?.name ?? heading;

  return (
    <div className="hub-folder-pane">
      <div className="hub-folder-head">
        <span className="hub-folder-name">{heading}</span>
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
        rootName={folderName}
        query={query}
        onNavigate={navigate}
        onOpen={onOpen}
      />
    </div>
  );
}
