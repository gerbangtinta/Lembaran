import { useMemo, useState } from 'react';
import { ThemeToggle } from '@lembaran/ui';
import type { HubShellProps } from '../props';
import { ReaderCard } from '../component/ReaderCard';
import { SearchIcon } from '../component/icons';
import { MobileFolderList } from './MobileFolderList';
import './hub-phone.css';

type Tab = 'readers' | 'folder' | 'recent';

/** A phone gets one column and one section at a time: tabs instead of a long scroll. */
export function HubMobileShell({
  entries,
  recents,
  busyId,
  error,
  folder,
  onLaunch,
  onOpenRecent,
  onRemoveRecent,
  onOpenFolderFile,
  onDismissError,
}: HubShellProps) {
  const [tab, setTab] = useState<Tab>('readers');
  const [query, setQuery] = useState('');
  const wanted = query.trim().toLowerCase();

  // the same search the desk has: it filters readers and the bound folder's files
  const readers = useMemo(
    () =>
      wanted.length === 0
        ? entries
        : entries.filter((entry) =>
            [entry.name, entry.blurb, ...entry.extensions].some((field) =>
              field.toLowerCase().includes(wanted),
            ),
          ),
    [entries, wanted],
  );

  const folderCount = folder.files.length;

  return (
    <div className="hub-shell hub-shell-phone">
      <header className="hub-bar">
        <div className="hub-brand">
          <span className="hub-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 19c0-7.5 4.5-12 14-12 0 9.5-4.5 14-12 14H5Z" />
              <path d="M5 19c2-4 5-7 9-9" />
            </svg>
          </span>
          <span className="hub-word">Lembaran</span>
          <span className="lb-chip hub-version">{__APP_VERSION__}</span>
        </div>

        <label className="hub-search-phone">
          <SearchIcon />
          <input
            className="lb-field"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            aria-label="Search readers and files"
          />
        </label>

        <div className="hub-bar-actions">
          <ThemeToggle />
        </div>
      </header>

      <div className="hub-tabs" role="tablist" aria-label="Sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'readers'}
          className={tab === 'readers' ? 'hub-tab is-on' : 'hub-tab'}
          onClick={() => setTab('readers')}
        >
          Readers
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'folder'}
          className={tab === 'folder' ? 'hub-tab is-on' : 'hub-tab'}
          onClick={() => setTab('folder')}
        >
          Folder{folderCount > 0 ? ` · ${folderCount}` : ''}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'recent'}
          className={tab === 'recent' ? 'hub-tab is-on' : 'hub-tab'}
          onClick={() => setTab('recent')}
        >
          Recent
        </button>
      </div>

      {error !== null && (
        <div className="hub-error" role="alert">
          <span>{error}</span>
          <button type="button" className="lb-ghost" onClick={onDismissError} aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      <main className="hub-main">
        {tab === 'readers' && (
          <section aria-label="Readers">
            {readers.length === 0 ? (
              <p className="hub-note">No reader matches “{query}”.</p>
            ) : (
              <div className="hub-list">
                {readers.map((entry) => (
                  <ReaderCard
                    key={entry.id}
                    entry={entry}
                    busy={busyId === entry.id}
                    onLaunch={onLaunch}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'folder' && (
          <section aria-label="Bound folder" className="hub-pane">
            <MobileFolderList folder={folder} query={query} onOpen={onOpenFolderFile} />
          </section>
        )}

        {tab === 'recent' && (
          <section aria-label="Recently opened">
            {recents.length === 0 ? (
              <p className="hub-note">Nothing opened yet. Open a file to see it here.</p>
            ) : (
              <ul className="hub-recents">
                {recents.map((recent) => (
                  <li key={recent.id} className="hub-recent-row">
                    <button
                      type="button"
                      className="hub-recent"
                      onClick={() => onOpenRecent(recent)}
                    >
                      <span className="hub-recent-name">{recent.name}</span>
                      <span className="hub-recent-when">
                        {new Date(recent.openedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="hub-recent-x"
                      onClick={() => onRemoveRecent(recent.id)}
                      aria-label={`Remove ${recent.name} from recent`}
                      title="Remove from recent"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
