import { useEffect, useRef, useState } from 'react';
import type { FolderFile } from '@lembaran/framework';
import { SearchIcon } from '../component/icons';
import { FolderBrowser } from './FolderBrowser';
import { FlatFileList } from './FlatFileList';

interface Props {
  title: string;
  files: readonly FolderFile[];
  path: string;
  onNavigate(path: string): void;
  onOpen(entry: FolderFile): void;
  onClose(): void;
  /** a drive panel brings its own walking and paging, so it replaces the tree views instead of feeding them */
  drive?: React.ReactNode;
}

type Mode = 'folders' | 'all';

/**
 * The same folder, given the room a file manager gets: 90% of the window, over a blurred and darkened
 * page. Two ways to read it — step through folders, or flat-list every document in the tree — and a search
 * that reaches the whole tree either way. Escape, the close button and the backdrop all leave; the panel
 * takes focus so a keyboard user lands inside it.
 */
export function FolderOverlay({ title, files, path, onNavigate, onOpen, onClose, drive }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>('folders');
  const [query, setQuery] = useState('');

  useEffect(() => {
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setQuery('');
      if (event.key === 'Escape' && query.length === 0) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, query]);

  const wanted = query.trim().toLowerCase();
  const flat = wanted.length === 0 ? files : files.filter((file) => file.path.toLowerCase().includes(wanted));
  const onDrive = drive !== undefined;

  return (
    <div
      className="hub-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="hub-overlay-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`${title} — folder`}
        tabIndex={-1}
        ref={panel}
      >
        <header className="hub-overlay-head">
          <div>
            <h2 className="lb-label">Folder</h2>
            <span className="hub-overlay-title">{title}</span>
          </div>
          {!onDrive && (
            <label className="hub-search-overlay">
              <SearchIcon />
              <input
                className="lb-field"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search this folder"
                aria-label="Search this folder"
              />
            </label>
          )}
          {!onDrive && (
            <div className="hub-overlay-modes" role="tablist" aria-label="How to browse">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'folders'}
                className={mode === 'folders' ? 'hub-mode is-on' : 'hub-mode'}
                onClick={() => setMode('folders')}
              >
                Folders
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'all'}
                className={mode === 'all' ? 'hub-mode is-on' : 'hub-mode'}
                onClick={() => setMode('all')}
              >
                All files
              </button>
            </div>
          )}
          <button type="button" className="lb-ghost" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="hub-overlay-body">
          {drive !== undefined ? (
            drive
          ) : mode === 'folders' ? (
            <FolderBrowser
              files={files}
              path={path}
              rootName={title}
              query={query}
              onNavigate={onNavigate}
              onOpen={onOpen}
            />
          ) : (
            <FlatFileList files={flat} onOpen={onOpen} />
          )}
        </div>
      </div>
    </div>
  );
}
