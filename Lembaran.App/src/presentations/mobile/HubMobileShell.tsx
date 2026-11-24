import type { HubShellProps } from '../layout/HubShell';
import { ReaderCard } from '../component/ReaderCard';
import './hub-phone.css';

/** A phone gets a list, not a grid: one reader per row, full-width targets. */
export function HubMobileShell({
  entries,
  recents,
  busyId,
  error,
  onLaunch,
  onOpenRecent,
  onDismissError,
}: HubShellProps) {
  return (
    <div className="hub-shell hub-shell-phone">
      <header className="hub-header">
        <h1>Lembaran</h1>
        <p>Files stay on this device.</p>
      </header>

      {error !== null && (
        <div className="hub-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={onDismissError} aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      <section className="hub-list" aria-label="Readers">
        {entries.map((entry) => (
          <ReaderCard key={entry.id} entry={entry} busy={busyId === entry.id} onLaunch={onLaunch} />
        ))}
      </section>

      <section className="hub-recents" aria-label="Recently opened">
        <h2>Recent</h2>
        {recents.length === 0 ? (
          <p className="hub-empty">Nothing opened yet.</p>
        ) : (
          <ul>
            {recents.map((recent) => (
              <li key={recent.id}>
                <button type="button" onClick={() => onOpenRecent(recent)}>
                  <span className="hub-recent-name">{recent.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
