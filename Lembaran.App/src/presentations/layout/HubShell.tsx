import { useMemo, useState } from 'react';
import { ThemeToggle, useAppScale } from '@lembaran/ui';
import type { HubShellProps } from '../props';
import { ReaderCard } from '../component/ReaderCard';
import { FolderLibrary } from './FolderLibrary';

/** The hub on a wide screen: one bar to act from, then folder, readers and recents in that order. */
export function HubShell({
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
  const [query, setQuery] = useState('');
  const wanted = query.trim().toLowerCase();
  const appScale = useAppScale();

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

  return (
    <div className="hub-shell">
      <header className="hub-bar">
        <div className="hub-brand">
          <span className="hub-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 19c0-7.5 4.5-12 14-12 0 9.5-4.5 14-12 14H5Z" />
              <path d="M5 19c2-4 5-7 9-9" />
            </svg>
          </span>
          <span className="hub-word">Lembaran</span>
          <span className="lb-chip">{__APP_VERSION__}</span>
        </div>

        <label className="hub-search">
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4 4" />
          </svg>
          <input
            className="lb-field"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search readers and files"
            aria-label="Search readers and files"
          />
        </label>

        <div className="hub-bar-actions">
          {/* the scale is desk chrome: a phone has no Ctrl + scroll, and its bar carries none */}
          <button
            type="button"
            className="hub-scale"
            onClick={() => appScale.reset()}
            title={`App scale ${Math.round(appScale.scale * 100)}% — Ctrl + scroll to change, click to reset`}
            aria-label={`App scale ${Math.round(appScale.scale * 100)} percent. Click to reset to 100 percent`}
          >
            {Math.round(appScale.scale * 100)}%
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main className="hub-main">
        <div className="hub-main-inner">
          <div className="hub-intro">
            <h1>Read anything. Keep it local.</h1>
            <p>
              PDF, Word, PowerPoint, Excel and CSV, opened in this browser. The file is copied into a
              private store on this device and never uploaded.
            </p>
          </div>

          {error !== null && (
            <div className="hub-error" role="alert">
              <span>{error}</span>
              <button type="button" className="lb-ghost" onClick={onDismissError} aria-label="Dismiss">
                ✕
              </button>
            </div>
          )}

          <section className="hub-section" aria-label="Bound folder">
            <header className="hub-section-head">
              <h2 className="lb-label">Folder</h2>
              {folder.error !== null && <span className="hub-flag">{folder.error}</span>}
            </header>
            <FolderLibrary folder={folder} query={query} onOpen={onOpenFolderFile} />
          </section>

          <section className="hub-section" aria-label="Readers">
            <header className="hub-section-head">
              <h2 className="lb-label">Readers</h2>
              <span className="hub-count">{readers.length}</span>
            </header>
            {readers.length === 0 ? (
              <p className="hub-note">No reader matches “{query}”.</p>
            ) : (
              <div className="hub-grid">
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

          <section className="hub-section" aria-label="Recently opened">
            <header className="hub-section-head">
              <h2 className="lb-label">Recent</h2>
              <span className="hub-count">{recents.length}</span>
            </header>
            {recents.length === 0 ? (
              <p className="hub-note">Nothing opened yet. Drop a file anywhere on this window.</p>
            ) : (
              <ul className="hub-recents">
                {recents.map((recent) => (
                  <li key={recent.id} className="hub-recent-row">
                    <button type="button" className="hub-recent" onClick={() => onOpenRecent(recent)}>
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
        </div>
      </main>

      <footer className="hub-foot">
        <span>Nothing is uploaded. A reader writes only the file you ask it to save.</span>
        <span className="lb-chip">GPL-3.0-only</span>
      </footer>
    </div>
  );
}
