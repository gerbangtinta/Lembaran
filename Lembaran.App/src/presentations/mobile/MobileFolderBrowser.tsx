import { folderView, pathSegments, searchFolder, type FolderFile } from '@lembaran/framework';

interface Props {
  files: readonly FolderFile[];
  path: string;
  rootName: string;
  query?: string;
  onNavigate(path: string): void;
  onOpen(entry: FolderFile): void;
}

function meta(file: FolderFile): string {
  const size =
    file.size < 1024 * 1024
      ? `${Math.round(file.size / 1024)} KB`
      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
  return `.${file.extension} · ${size}`;
}

/** One level of the bound folder on a phone: crumbs you can tap, folders first, thumb-sized rows. */
export function MobileFolderBrowser({ files, path, rootName, query, onNavigate, onOpen }: Props) {
  const searching = (query ?? '').trim().length > 0;
  const view = folderView(files, path);
  const found = searching ? searchFolder(files, query ?? '') : { folders: [], files: [] };
  const segments = pathSegments(path);

  if (searching) {
    const empty = found.folders.length === 0 && found.files.length === 0;
    return (
      <div className="hub-browse-pane">
        <p className="hub-note hub-note-tight">
          {empty
            ? `Nothing matches “${query}”.`
            : `${found.folders.length} folder${found.folders.length === 1 ? '' : 's'} and ${found.files.length} file${found.files.length === 1 ? '' : 's'} match “${query}”.`}
        </p>
        {!empty && (
          <ul className="hub-list hub-browse-phone">
            {found.folders.map((folder) => (
              <li key={`dir:${folder.path}`}>
                <button
                  type="button"
                  className="hub-card hub-row hub-row-folder"
                  onClick={() => onNavigate(folder.path)}
                >
                  <span className="hub-row-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
                      <path d="M3 7.5h6l2 2.5h10v9H3z" />
                    </svg>
                  </span>
                  <span className="hub-row-label">{folder.name}</span>
                  <span className="hub-row-chevron" aria-hidden="true">
                    ›
                  </span>
                </button>
              </li>
            ))}
            {found.files.map((file) => (
              <li key={file.path}>
                <button
                  type="button"
                  className="hub-card hub-file-card"
                  onClick={() => onOpen(file)}
                >
                  <span className="hub-file-name">{file.name}</span>
                  <span className="hub-file-meta">{meta(file)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="hub-browse-pane">
      <div className="hub-crumbs hub-crumbs-phone" aria-label="Folder path">
        <button
          type="button"
          className="hub-crumb"
          onClick={() => onNavigate('')}
          aria-current={segments.length === 0 ? 'location' : undefined}
        >
          {rootName}
        </button>
        {segments.map((segment, index) => (
          <span className="hub-crumb-group" key={`${segment}-${index}`}>
            <span className="hub-crumb-sep" aria-hidden="true">
              /
            </span>
            <button
              type="button"
              className="hub-crumb"
              onClick={() => onNavigate(segments.slice(0, index + 1).join('/'))}
              aria-current={index === segments.length - 1 ? 'location' : undefined}
            >
              {segment}
            </button>
          </span>
        ))}
      </div>

      {view.folders.length === 0 && view.files.length === 0 && segments.length === 0 ? (
        <p className="hub-note">No readable files in this folder.</p>
      ) : (
        <ul className="hub-list hub-browse-phone">
          {segments.length > 0 && (
            <li>
              <button
                type="button"
                className="hub-card hub-row hub-row-parent"
                onClick={() => onNavigate(segments.slice(0, -1).join('/'))}
              >
                <span className="hub-row-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 19V5" />
                    <path d="m6 11 6-6 6 6" />
                  </svg>
                </span>
                <span className="hub-row-label">..</span>
              </button>
            </li>
          )}
          {view.folders.map((name) => (
            <li key={`dir:${name}`}>
              <button
                type="button"
                className="hub-card hub-row hub-row-folder"
                onClick={() => onNavigate(path.length === 0 ? name : `${path}/${name}`)}
              >
                <span className="hub-row-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
                    <path d="M3 7.5h6l2 2.5h10v9H3z" />
                  </svg>
                </span>
                <span className="hub-row-label">{name}</span>
                <span className="hub-row-chevron" aria-hidden="true">
                  ›
                </span>
              </button>
            </li>
          ))}
          {view.files.map((file) => (
            <li key={file.path}>
              <button
                type="button"
                className="hub-card hub-file-card"
                onClick={() => onOpen(file)}
              >
                <span className="hub-file-name">{file.name}</span>
                <span className="hub-file-meta">{meta(file)}</span>
              </button>
            </li>
          ))}
          {view.folders.length === 0 && view.files.length === 0 && (
            <li>
              <p className="hub-note hub-row-empty">This folder is empty.</p>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
