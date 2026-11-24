import type { ReaderEntry } from '../../feature/choose';

interface Props {
  entry: ReaderEntry;
  busy: boolean;
  onLaunch(entry: ReaderEntry): void;
}

export function ReaderCard({ entry, busy, onLaunch }: Props) {
  return (
    <article className={`hub-card${entry.available ? '' : ' is-planned'}`}>
      <header>
        <h2>{entry.name}</h2>
        <span className="hub-ext">.{entry.extensions.join(' .')}</span>
      </header>
      <p>{entry.blurb}</p>
      <button
        type="button"
        onClick={() => onLaunch(entry)}
        disabled={busy || !entry.available}
        aria-label={entry.available ? `Open a ${entry.name} file` : `${entry.name} reader is not built yet`}
      >
        {busy ? 'Opening…' : entry.available ? `Open ${entry.name}` : 'Coming next'}
      </button>
    </article>
  );
}
