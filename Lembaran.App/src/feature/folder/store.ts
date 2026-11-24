import { useCallback, useEffect, useState } from 'react';
import {
  bindFolder,
  ensureFolderPermission,
  folderPermission,
  hasDirectoryPicker,
  listFolder,
  loadBoundFolder,
  pickFolderFallback,
  unbindFolder,
  type BoundFolder,
  type FolderFile,
} from '@lembaran/framework';
import { READERS } from '../choose';

export type FolderState =
  /** no folder bound yet */
  | 'empty'
  /** bound, but this session has to be granted permission again — one click, inside a gesture */
  | 'needs-permission'
  /** bound and listed */
  | 'ready'
  /** bound on a browser that cannot remember a directory: this listing lives until reload */
  | 'transient'
  | 'loading';

export interface BoundFolderApi {
  state: FolderState;
  folder: BoundFolder | null;
  files: FolderFile[];
  error: string | null;
  /** false on Firefox and iOS, where the folder is a one-off pick */
  canBind: boolean;
  bind(): Promise<void>;
  reconnect(): Promise<void>;
  release(): Promise<void>;
}

/** Every extension a built reader accepts — the folder shows exactly what the app can open. */
export const READABLE_EXTENSIONS: readonly string[] = [
  ...new Set(READERS.filter((entry) => entry.available).flatMap((entry) => entry.extensions)),
];

export function useBoundFolder(): BoundFolderApi {
  const [folder, setFolder] = useState<BoundFolder | null>(null);
  const [files, setFiles] = useState<FolderFile[]>([]);
  const [state, setState] = useState<FolderState>('loading');
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (handle: FileSystemDirectoryHandle) => {
    const listing = await listFolder(handle, READABLE_EXTENSIONS);
    setFiles(listing);
    setState('ready');
  }, []);

  // a bound folder outlives the tab, but its permission does not: ask the cheap question first
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await loadBoundFolder();
      if (cancelled) return;
      if (!stored) {
        setState('empty');
        return;
      }
      setFolder(stored);
      const permission = await folderPermission(stored.handle);
      if (cancelled) return;
      if (permission === 'granted') {
        try {
          await list(stored.handle);
        } catch {
          setState('needs-permission');
        }
        return;
      }
      setState('needs-permission');
    })();
    return () => {
      cancelled = true;
    };
  }, [list]);

  const bind = useCallback(async () => {
    setError(null);
    setState('loading');
    try {
      if (hasDirectoryPicker()) {
        const picked = await bindFolder();
        if (!picked) {
          setState(folder ? 'ready' : 'empty');
          return;
        }
        setFolder(picked);
        await list(picked.handle);
        return;
      }
      const picked = await pickFolderFallback(READABLE_EXTENSIONS);
      setFiles(picked);
      setState(picked.length > 0 ? 'transient' : 'empty');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      setState(folder ? 'needs-permission' : 'empty');
    }
  }, [folder, list]);

  const reconnect = useCallback(async () => {
    if (!folder) return;
    setError(null);
    const permission = await ensureFolderPermission(folder.handle);
    if (permission !== 'granted') {
      setState('needs-permission');
      return;
    }
    try {
      await list(folder.handle);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
      setState('needs-permission');
    }
  }, [folder, list]);

  const release = useCallback(async () => {
    await unbindFolder().catch(() => undefined);
    setFolder(null);
    setFiles([]);
    setError(null);
    setState('empty');
  }, []);

  return {
    state,
    folder,
    files,
    error,
    canBind: hasDirectoryPicker(),
    bind,
    reconnect,
    release,
  };
}
