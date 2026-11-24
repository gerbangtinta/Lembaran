import type { FolderFile } from '@lembaran/framework';
import type { BoundFolderApi, DriveView } from '../../feature/folder';

interface Props {
  folder: BoundFolderApi;
  onOpen(entry: FolderFile): void;
  /** the picker dialog carries its own Cancel/Use footer, so the panel does not repeat it above the list */
  hideBind?: boolean;
}

function bytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function when(time: number): string {
  if (time === 0) return '';
  return new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * The drive panel: the drives an account can see, then the folders inside one, one level at a time. The same
 * rows serve both jobs — choosing a folder to bind (the "Bind this folder" bar) and browsing the one already
 * bound — because they are the same walk.
 */
export function DriveFolder({ folder, onOpen, hideBind = false }: Props) {
  const view = folder.driveView;
  if (!view) return null;

  const atRoot = view.driveId === null;
  const canBind = view.choosing && view.driveId !== null && !hideBind;

  return (
    <div className="hub-browse-pane">
      <div className="hub-crumbs" aria-label="Drive path">
        <button
          type="button"
          className="hub-crumb"
          onClick={() => void folder.driveTo(-1)}
          disabled={!view.choosing}
          aria-current={atRoot ? 'location' : undefined}
        >
          OneDrive
        </button>
        {view.stack.map((step, index) => (
          <span className="hub-crumb-group" key={step.id}>
            <span className="hub-crumb-sep" aria-hidden="true">
              /
            </span>
            <button
              type="button"
              className="hub-crumb"
              onClick={() => void folder.driveTo(index)}
              aria-current={index === view.stack.length - 1 ? 'location' : undefined}
            >
              {index === 0 ? (step.name || view.driveName) : step.name}
            </button>
          </span>
        ))}
      </div>

      {canBind && (
        <div className="hub-invite hub-invite-tight">
          <div>
            <h3>Bind this folder</h3>
            <p>
              {view.stack[0]?.name ?? view.driveName} — the hub will list what is inside, and the PDF reader saves
              back into it.
            </p>
          </div>
          <button type="button" className="lb-primary" onClick={() => void folder.bindHere()}>
            Use this folder
          </button>
        </div>
      )}

      {atRoot ? (
        <DriveList view={view} folder={folder} />
      ) : (
        <ul className="hub-browse" tabIndex={0}>
          {view.folders.length === 0 && view.files.length === 0 && (
            <li>
              <p className="hub-note hub-row-empty">This folder holds nothing a reader can open.</p>
            </li>
          )}
          {view.folders.map((entry) => (
            <li key={`dir:${entry.id}`}>
              <button
                type="button"
                className="hub-row hub-row-folder"
                onClick={() => void folder.openDriveFolder(entry)}
              >
                <span className="hub-row-icon" aria-hidden="true">
                  <FolderIcon />
                </span>
                <span className="hub-row-text">
                  <span className="hub-row-label">{entry.name}</span>
                  <span className="hub-row-meta">folder</span>
                </span>
                <span className="hub-row-action" aria-hidden="true">
                  ›
                </span>
              </button>
            </li>
          ))}
          {view.files.map((file) => (
            <li key={file.cloud?.itemId ?? file.path}>
              <button type="button" className="hub-row" onClick={() => onOpen(file)} title={file.name}>
                <span className="hub-row-icon" aria-hidden="true">
                  <FileIcon />
                </span>
                <span className="hub-row-text">
                  <span className="hub-row-label">{file.name}</span>
                  <span className="hub-row-meta">
                    .{file.extension} · {bytes(file.size)}
                    {when(file.modifiedAt).length > 0 ? ` · ${when(file.modifiedAt)}` : ''}
                  </span>
                </span>
                <span className="hub-row-action">Open</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The drives themselves, as folders you can step into. */
function DriveList({ view, folder }: { view: DriveView; folder: BoundFolderApi }) {
  if (view.drives.length === 0) {
    return <p className="hub-note">Listing the drives…</p>;
  }
  return (
    <ul className="hub-browse" tabIndex={0}>
      {view.drives.map((drive) => (
        <li key={drive.id}>
          <button
            type="button"
            className="hub-row hub-row-folder"
            onClick={() =>
              void folder.openDriveFolder({
                id: drive.id,
                name: drive.name,
                folder: true,
                size: 0,
                modifiedAt: 0,
                etag: '',
              })
            }
          >
            <span className="hub-row-icon" aria-hidden="true">
              <FolderIcon />
            </span>
            <span className="hub-row-text">
              <span className="hub-row-label">{drive.name}</span>
              <span className="hub-row-meta">
                {drive.kind === 'personal'
                  ? 'personal OneDrive'
                  : drive.kind === 'documentLibrary'
                    ? 'SharePoint library'
                    : 'OneDrive for work'}
              </span>
            </span>
            <span className="hub-row-action" aria-hidden="true">
              ›
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
      <path d="M3 7.5h6l2 2.5h10v9H3z" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
    </svg>
  );
}
