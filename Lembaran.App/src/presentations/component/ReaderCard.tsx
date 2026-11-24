import type { ReaderEntry } from '../../feature/choose';

interface Props {
  entry: ReaderEntry;
  busy: boolean;
  onLaunch(entry: ReaderEntry): void;
}

export function ReaderCard({ entry, busy, onLaunch }: Props) {
  const article = /^[aeiou]/i.test(entry.name) ? 'an' : 'a';
  const label = entry.available
    ? `Open ${article} ${entry.name} file`
    : `${entry.name} reader is not built yet`;

  return (
    <article className={`hub-card${entry.available ? '' : ' is-planned'}`}>
      <header>
        <h2>{entry.name}</h2>
        <span className="lb-chip">.{entry.extensions.join(' .')}</span>
      </header>
      <p>{entry.blurb}</p>
      <button
        type="button"
        className={`hub-card-open ${entry.available ? 'lb-primary' : 'lb-ghost'}`}
        onClick={() => onLaunch(entry)}
        disabled={busy || !entry.available}
        aria-label={label}
      >
        {busy ? 'Opening…' : entry.available ? 'Open' : 'Coming next'}
      </button>
    </article>
  );
}
