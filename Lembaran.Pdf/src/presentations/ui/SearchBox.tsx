import { useEffect, useRef } from 'react';
import type { SearchState } from '../../feature/search';

interface Props {
  search: SearchState;
  onHit(page: number): void;
}

export function SearchBox({ search, onHit }: Props) {
  const field = useRef<HTMLInputElement>(null);

  // a find box opens with its last term selected, so the next word typed replaces it instead of extending it
  useEffect(() => {
    field.current?.focus();
    field.current?.select();
  }, []);

  return (
    <form
      className="pdf-search"
      onSubmit={(event) => {
        event.preventDefault();
        void search.run().then((hits) => {
          const first = hits[0];
          if (first?.target?.page) onHit(first.target.page);
        });
      }}
      role="search"
    >
      <input
        ref={field}
        type="search"
        value={search.query}
        placeholder="Find in document"
        aria-label="Find in document"
        onChange={(event) => search.setQuery(event.target.value)}
      />
      <button type="submit" disabled={search.busy || search.query.trim().length === 0}>
        Find
      </button>
      {search.hits.length > 0 && (
        <>
          <span className="pdf-search-count">
            {search.active + 1}/{search.hits.length}
          </span>
          <button
            type="button"
            aria-label="Previous match"
            onClick={() => {
              const hit = search.previous();
              if (hit?.target?.page) onHit(hit.target.page);
            }}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next match"
            onClick={() => {
              const hit = search.next();
              if (hit?.target?.page) onHit(hit.target.page);
            }}
          >
            ›
          </button>
        </>
      )}
      {search.hits.length === 0 && search.query.trim().length > 0 && !search.busy && (
        <span className="pdf-search-count">no match</span>
      )}
    </form>
  );
}
