import type { RecentEntry } from '@lembaran/framework';
import type { ReaderEntry, ReaderId } from '../../feature/choose';
import { ReaderCard } from '../component/ReaderCard';

export interface HubShellProps {
  entries: readonly ReaderEntry[];
  recents: RecentEntry[];
  busyId: ReaderId | null;
  error: string | null;
  onLaunch(entry: ReaderEntry): void;
  onOpenRecent(entry: RecentEntry): void;
  onDismissError(): void;
}

export function HubShell({
  entries,
  recents,
  busyId,
  error,
  onLaunch,
  onOpenRecent,
  onDismissError,
}: HubShellProps) {
  return (
    <div className="hub-shell">
      <header className="hub-header">
        <h1>Lembaran</h1>
        <p>Read documents in the browser. Nothing is uploaded — files stay on this device.</p>
      </header>

      {error !== null && (
        <div className="hub-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={onDismissError} aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      <section className="hub-grid" aria-label="Readers">
        {entries.map((entry) => (
          <ReaderCard key={entry.id} entry={entry} busy={busyId === entry.id} onLaunch={onLaunch} />
        ))}
      </section>

      <section className="hub-recents" aria-label="Recently opened">
        <h2>Recent</h2>
        {recents.length === 0 ? (
          <p className="hub-empty">Nothing opened yet. Drop a file anywhere on this page.</p>
        ) : (
          <ul>
            {recents.map((recent) => (
              <li key={recent.id}>
                <button type="button" onClick={() => onOpenRecent(recent)}>
                  <span className="hub-recent-name">{recent.name}</span>
                  <span className="hub-recent-when">
                    {new Date(recent.openedAt).toLocaleDateString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
