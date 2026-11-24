import { ToolButton } from '@lembaran/ui';
import { useEffect, useRef } from 'react';

export interface DocsFindBarProps {
  query: string;
  hits: number;
  current: number;
  onQuery(value: string): void;
  onStep(direction: 1 | -1): void;
  onClose(): void;
}

/** The find strip sits in the shell's banner slot, above the pages. */
export function DocsFindBar({ query, hits, current, onQuery, onStep, onClose }: DocsFindBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <div className="docs-findbar" role="search">
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder="Find in document"
        aria-label="Find in document"
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
      <span className="docs-findcount" aria-live="polite">
        {query.length === 0 ? '' : hits === 0 ? 'no matches' : `${current + 1} / ${hits}`}
      </span>
      <ToolButton label="Previous match" title="Previous match (Shift+Enter)" onClick={() => onStep(-1)} disabled={hits === 0}>
        ‹
      </ToolButton>
      <ToolButton label="Next match" title="Next match (Enter)" onClick={() => onStep(1)} disabled={hits === 0}>
        ›
      </ToolButton>
      <ToolButton label="Close find" onClick={onClose}>
        ✕
      </ToolButton>
    </div>
  );
}
