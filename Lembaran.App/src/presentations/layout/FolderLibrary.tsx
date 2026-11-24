import { useEffect, useState } from 'react';
import { folderView, type FolderFile } from '@lembaran/framework';
import type { BoundFolderApi } from '../../feature/folder';
import { useFolderPath } from '../../feature/folder';
import { folderSource, SOURCE_LABEL } from '../sources';
import { AccountMenu } from '../component/AccountMenu';
import { CountChip } from '../component/CountChip';
import { DrivePickerDialog } from '../component/DrivePickerDialog';
import { ExpandIcon, SwapFolderIcon, UnlinkIcon } from '../component/icons';
import { Loading } from '../component/Loading';
import { OneDriveSetup } from '../component/OneDriveSetup';
import { DriveFolder } from './DriveFolder';
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
 * after ten rows. The folder can be a directory on this device or one inside OneDrive; the rows are the same,
 * and only the way in differs. Expand opens the local browser over 90% of the window, with a flat "All files"
 * mode beside it — a drive is walked one level at a time instead, because it has no cheap recursive listing.
 */
export function FolderLibrary({ folder, query, onOpen }: Props) {
  const { state, folder: bound, canBind, driveFolder, account, driveView, cloudReady } = folder;
  const files = folder.files;
  const [confirmingForget, setConfirmingForget] = useState(false);
  const [expanded, setExpanded] = useState(false);
  /** "Change folder" asks where the new folder lives before it opens any picker */
  const [pickingSource, setPickingSource] = useState(false);
  /** a build with no client id is not a dead end: the id can be entered here */
  const [setupOpen, setSetupOpen] = useState(false);

  // a different folder, or a listing that no longer holds the open folder, starts at the top
  const rootKey = `${bound?.name ?? driveFolder?.name ?? ''}:${files.length}`;
  const { path, navigate } = useFolderPath(rootKey);
  useEffect(() => {
    setExpanded(false);
  }, [rootKey]);

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

  // a drive folder is remembered, but the account behind it is not: one click restores both
  if (state === 'drive-signed-out' || state === 'drive-expired') {
    return (
      <div className="hub-invite">
        <div>
          <h3>{state === 'drive-expired' ? 'Sign in to OneDrive again' : 'Connect OneDrive'}</h3>
          <p>
            {driveFolder
              ? `“${driveFolder.name}” is still bound. Signing in again restores the listing — nothing was uploaded or moved.`
              : 'Sign in to list a folder in OneDrive and open what is inside it.'}
          </p>
        </div>
        <div className="hub-invite-actions">
          <button type="button" className="lb-primary" onClick={() => void folder.signIn()}>
            Sign in
          </button>
          {driveFolder && (
            <button type="button" className="lb-ghost" onClick={() => void folder.release()}>
              Forget the drive
            </button>
          )}
          {/* the escape hatch for a self-hoster: this build ships a registration, but theirs can replace it */}
          <button type="button" className="lb-ghost" onClick={() => setSetupOpen(true)}>
            Use my own app registration
          </button>
        </div>
      </div>
    );
  }

  if (state === 'empty' || pickingSource || (state === 'transient' && files.length === 0)) {
    const boundSomething = bound !== null || driveFolder !== null;
    return (
      <>
        <div className="hub-invite">
          <div>
            <h3>
              {boundSomething
                ? canBind
                  ? 'Choose another folder'
                  : 'Upload another folder'
                : canBind
                  ? 'Bind a folder'
                  : 'Upload a folder'}
            </h3>
            <p>
              {canBind
                ? 'A folder on this device, or one inside OneDrive. Lembaran remembers it, lists every readable file inside, and opens them from here next session as well.'
                : 'This browser cannot keep a folder between visits, so a picked folder is listed until you reload.'}
            </p>
          </div>
          <div className="hub-invite-actions">
            <button
              type="button"
              className="lb-primary"
              onClick={() => {
                setPickingSource(false);
                void folder.bind();
              }}
            >
              {canBind ? 'This device' : 'Upload a folder'}
            </button>
            <button
              type="button"
              className="lb-ghost"
              onClick={() => {
                if (!cloudReady) {
                  setSetupOpen(true);
                  return;
                }
                setPickingSource(false);
                void folder.chooseDrive();
              }}
              title={
                cloudReady
                  ? 'Choose a folder inside OneDrive'
                  : 'OneDrive needs an app registration first — this asks for it'
              }
            >
              {cloudReady ? 'OneDrive' : 'Set up OneDrive'}
            </button>
            {boundSomething && (
              <button type="button" className="lb-ghost" onClick={() => setPickingSource(false)}>
                Cancel
              </button>
            )}
          </div>
        </div>

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
  }

  const onDrive = driveView !== null;
  /** a drive folder is being chosen, so the drive list belongs in its own window with a Cancel */
  const picking = driveView !== null && driveView.choosing;
  /** the heading names where the folder comes from; the breadcrumb underneath says which folder it is */
  const heading = SOURCE_LABEL[folderSource(folder.source)];
  const folderName = (onDrive ? driveFolder?.name ?? driveView?.driveName : bound?.name) ?? heading;
  const here = folderView(files, path);

  return (
    <>
      <div className="hub-folder-head">
        <span className="hub-folder-name">
          {onDrive && driveView?.choosing ? 'Choose a folder' : heading}
        </span>
        <CountChip files={files} />
        {onDrive && (
          <AccountMenu
            account={account}
            onAddAccount={() => void folder.addAccount()}
            onRemoveAccount={() => void folder.signOut()}
          />
        )}
        {state === 'transient' && <span className="hub-flag">not remembered after a reload</span>}

        <div className="hub-folder-actions">
          {(bound || driveFolder) && (
            <button
              type="button"
              className="hub-icon-btn"
              onClick={() => setExpanded(true)}
              title="Expand"
              aria-label="Expand the folder into a larger window"
            >
              <ExpandIcon />
            </button>
          )}
          <button
            type="button"
            className="hub-icon-btn"
            onClick={() => (onDrive ? void folder.chooseDrive() : setPickingSource(true))}
            title={onDrive ? 'Choose another drive folder' : 'Change folder'}
            aria-label={onDrive ? 'Choose another drive folder' : 'Change folder'}
          >
            <SwapFolderIcon />
          </button>
          {(bound || driveFolder) &&
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
                <button type="button" className="lb-ghost" onClick={() => setConfirmingForget(false)}>
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

      {onDrive ? (
        picking ? (
          <p className="hub-note">Choosing a folder in OneDrive…</p>
        ) : (
          <DriveFolder folder={folder} onOpen={onOpen} />
        )
      ) : (
        <FolderBrowser
          files={files}
          path={path}
          rootName={folderName}
          query={query}
          onNavigate={navigate}
          onOpen={onOpen}
        />
      )}

      {!onDrive && here.files.length + here.folders.length > 0 && (
        <p className="hub-note hub-note-tight">
          {here.folders.length > 0 &&
            `${here.folders.length} folder${here.folders.length === 1 ? '' : 's'} · `}
          {here.files.length} file{here.files.length === 1 ? '' : 's'}
        </p>
      )}

      {expanded && (bound || driveFolder) && (
        <FolderOverlay
          title={folderName}
          files={files}
          path={path}
          onNavigate={navigate}
          onOpen={onOpen}
          onClose={() => setExpanded(false)}
          drive={onDrive ? <DriveFolder folder={folder} onOpen={onOpen} /> : undefined}
        />
      )}

      {picking && <DrivePickerDialog folder={folder} onOpen={onOpen} />}

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
}
