import { folderView, pathSegments, searchFolder, type FolderFile } from '@lembaran/framework';

interface Props {
  /** every readable file found in the bound folder, nested paths included */
  files: readonly FolderFile[];
  /** the directory being browsed; '' is the bound folder itself */
  path: string;
  /** shown as the first crumb, because the folder name is the start of the path */
  rootName: string;
  /** a search term replaces the level view with matches from the whole tree */
  query?: string;
  onNavigate(path: string): void;
  onOpen(entry: FolderFile): void;
}

function bytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function when(time: number): string {
  return new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** `Reports/2024/q1.pdf` → `Reports/2024/`; '' at the top level. */
function dirOf(path: string, name: string): string {
  const cut = path.length - name.length;
  return cut > 0 ? path.slice(0, cut) : '';
}

/**
 * One level of the bound folder, with a breadcrumb to walk back up. Subfolders come first because
 * that is how a folder reads; the file list scrolls inside ten rows instead of pushing the page down.
 */
export function FolderBrowser({ files, path, rootName, query, onNavigate, onOpen }: Props) {
  const searching = (query ?? '').trim().length > 0;
  const view = folderView(files, path);
  const found = searching ? searchFolder(files, query ?? '') : { folders: [], files: [] };
  const segments = pathSegments(path);

  const parent = () => onNavigate(segments.slice(0, -1).join('/'));

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
          <ul className="hub-browse" tabIndex={0}>
            {found.folders.map((folder) => (
              <li key={`dir:${folder.path}`}>
                <button
                  type="button"
                  className="hub-row hub-row-folder"
                  onClick={() => onNavigate(folder.path)}
                  title={folder.path}
                >
                  <span className="hub-row-icon" aria-hidden="true">
                    <FolderIcon />
                  </span>
                  <span className="hub-row-text">
                    <span className="hub-row-label">{folder.name}</span>
                    <span className="hub-row-meta">{folder.path}</span>
                  </span>
                  <span className="hub-row-action" aria-hidden="true">
                    ›
                  </span>
                </button>
              </li>
            ))}
            {found.files.map((file) => (
              <li key={file.path}>
                <button type="button" className="hub-row" onClick={() => onOpen(file)} title={file.path}>
                  <span className="hub-row-icon" aria-hidden="true">
                    <FileIcon />
                  </span>
                  <span className="hub-row-text">
                    <span className="hub-row-label">{file.name}</span>
                    <span className="hub-row-meta">
                      {dirOf(file.path, file.name)}
                      {dirOf(file.path, file.name).length > 0 ? ' · ' : ''}.{file.extension} ·{' '}
                      {bytes(file.size)} · {when(file.modifiedAt)}
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

  return (
    <>
      <div className="hub-crumbs" aria-label="Folder path">
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
        <p className="hub-note">No PDF, Word, PowerPoint, Excel or CSV files in this folder or its subfolders.</p>
      ) : (
        <ul className="hub-browse" tabIndex={0}>
          {segments.length > 0 && (
            <li>
              <button type="button" className="hub-row hub-row-parent" onClick={parent}>
                <span className="hub-row-icon" aria-hidden="true">
                  <ParentIcon />
                </span>
                <span className="hub-row-text">
                  <span className="hub-row-label">..</span>
                  <span className="hub-row-meta">up one folder</span>
                </span>
              </button>
            </li>
          )}
          {view.folders.length === 0 && view.files.length === 0 && (
            <li>
              <p className="hub-note hub-row-empty">This folder holds no readable files.</p>
            </li>
          )}
          {view.folders.map((name) => (
            <li key={`dir:${name}`}>
              <button
                type="button"
                className="hub-row hub-row-folder"
                onClick={() => onNavigate(path.length === 0 ? name : `${path}/${name}`)}
              >
                <span className="hub-row-icon" aria-hidden="true">
                  <FolderIcon />
                </span>
                <span className="hub-row-text">
                  <span className="hub-row-label">{name}</span>
                  <span className="hub-row-meta">folder</span>
                </span>
                <span className="hub-row-action" aria-hidden="true">
                  ›
                </span>
              </button>
            </li>
          ))}
          {view.files.map((file) => (
            <li key={file.path}>
              <button type="button" className="hub-row" onClick={() => onOpen(file)} title={file.path}>
                <span className="hub-row-icon" aria-hidden="true">
                  <FileIcon />
                </span>
                <span className="hub-row-text">
                  <span className="hub-row-label">{file.name}</span>
                  <span className="hub-row-meta">
                    .{file.extension} · {bytes(file.size)} · {when(file.modifiedAt)}
                  </span>
                </span>
                <span className="hub-row-action">Open</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ParentIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </svg>
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
