import { hitLabel } from '../../feature/view';

export interface FindBarProps {
  query: string;
  found: number;
  index: number;
  onQuery(value: string): void;
  onStep(direction: 1 | -1): void;
  onClose(): void;
}

/** Find over every sheet: type, Enter for the next hit, Shift+Enter for the previous one. */
export function FindBar({ query, found, index, onQuery, onStep, onClose }: FindBarProps) {
  return (
    <div className="xl-find" role="search">
      <input
        className="xl-find-input"
        type="search"
        value={query}
        placeholder="Find in workbook"
        aria-label="Find in workbook"
        autoFocus
        onChange={(event) => onQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onStep(event.shiftKey ? -1 : 1);
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
          }
        }}
      />
      <span className="xl-find-count" aria-live="polite">
        {query.trim().length === 0 ? 'Type to search' : hitLabel(index, found)}
      </span>
      <button
        type="button"
        className="xl-find-step"
        onClick={() => onStep(-1)}
        disabled={found === 0}
        aria-label="Previous match"
      >
        ‹
      </button>
      <button
        type="button"
        className="xl-find-step"
        onClick={() => onStep(1)}
        disabled={found === 0}
        aria-label="Next match"
      >
        ›
      </button>
      <button type="button" className="xl-find-step" onClick={onClose} aria-label="Close find">
        ✕
      </button>
    </div>
  );
}
