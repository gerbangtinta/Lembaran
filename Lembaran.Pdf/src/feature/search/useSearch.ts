import { useCallback, useEffect, useRef, useState } from 'react';
import type { SearchHit } from '@lembaran/framework';
import type { PDFDocumentProxy } from '../open';
import { searchDocument } from './actions';

export interface SearchState {
  query: string;
  hits: SearchHit[];
  active: number;
  busy: boolean;
  setQuery(query: string): void;
  run(): Promise<SearchHit[]>;
  clear(): void;
  next(): SearchHit | undefined;
  previous(): SearchHit | undefined;
}

export function useSearch(doc: PDFDocumentProxy | null): SearchState {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const cancelled = useRef(false);

  useEffect(() => {
    return () => {
      cancelled.current = true;
    };
  }, []);

  const run = useCallback(async (): Promise<SearchHit[]> => {
    if (!doc || query.trim().length === 0) {
      setHits([]);
      setActive(0);
      return [];
    }
    cancelled.current = false;
    setBusy(true);
    try {
      const found = await searchDocument(doc, query, () => cancelled.current);
      if (cancelled.current) return [];
      setHits(found);
      setActive(0);
      return found;
    } finally {
      if (!cancelled.current) setBusy(false);
    }
  }, [doc, query]);

  const clear = useCallback(() => {
    cancelled.current = true;
    setQuery('');
    setHits([]);
    setActive(0);
    setBusy(false);
  }, []);

  const step = useCallback(
    (delta: number): SearchHit | undefined => {
      if (hits.length === 0) return undefined;
      const nextIndex = (active + delta + hits.length) % hits.length;
      setActive(nextIndex);
      return hits[nextIndex];
    },
    [active, hits],
  );

  return {
    query,
    hits,
    active,
    busy,
    setQuery,
    run,
    clear,
    next: () => step(1),
    previous: () => step(-1),
  };
}
