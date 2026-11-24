import { useCallback, useEffect, useState } from 'react';
import { listRecent, type RecentEntry } from '@lembaran/framework';

export function useRecents(): { recents: RecentEntry[]; refresh(): void } {
  const [recents, setRecents] = useState<RecentEntry[]>([]);

  const refresh = useCallback(() => {
    void listRecent(8)
      .then(setRecents)
      .catch(() => setRecents([]));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { recents, refresh };
}
