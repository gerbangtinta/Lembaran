import { useCallback, useEffect, useState } from 'react';
import { forget, listRecent, type RecentEntry } from '@lembaran/framework';

export function useRecents(): {
  recents: RecentEntry[];
  refresh(): void;
  remove(id: string): void;
} {
  const [recents, setRecents] = useState<RecentEntry[]>([]);

  const refresh = useCallback(() => {
    void listRecent(8)
      .then(setRecents)
      .catch(() => setRecents([]));
  }, []);

  // dropping a recent is a one-click action with nothing to lose: the file on disk is untouched
  const remove = useCallback(
    (id: string) => {
      void forget(id)
        .then(refresh)
        .catch(refresh);
    },
    [refresh],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { recents, refresh, remove };
}
