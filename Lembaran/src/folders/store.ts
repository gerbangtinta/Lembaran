import { db, type BoundFolder } from '../handles/store';
import {
  FOLDER_DEPTH_LIMIT,
  FOLDER_FILE_LIMIT,
  shouldListPath,
  sortFolderFiles,
  type FolderFile,
} from './entries';

export type { BoundFolder } from '../handles/store';

const BOUND = 'bound';

interface DirectoryPickerOptions {
  id?: string;
  mode?: 'read' | 'readwrite';
  startIn?: string;
}

declare global {
  interface Window {
    showDirectoryPicker?: (options?: DirectoryPickerOptions) => Promise<FileSystemDirectoryHandle>;
  }

  // Not in every lib.dom revision yet; Chromium ships both.
  interface FileSystemDirectoryHandle {
    values(): AsyncIterableIterator<FileSystemHandle>;
    queryPermission?(descriptor?: { mode?: 'read' }): Promise<PermissionState>;
    requestPermission?(descriptor?: { mode?: 'read' }): Promise<PermissionState>;
  }
}

export function hasDirectoryPicker(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

/** Asks for read permission again. Must run inside a user gesture, or the browser refuses. */
export async function ensureFolderPermission(
  handle: FileSystemDirectoryHandle,
): Promise<PermissionState> {
  const query = handle.queryPermission;
  const request = handle.requestPermission;
  if (!query || !request) return 'granted';
  const descriptor = { mode: 'read' as const };
  if ((await query.call(handle, descriptor)) === 'granted') return 'granted';
  return request.call(handle, descriptor);
}

/** Permission without a prompt: tells the hub whether to show files or a Reconnect button. */
export async function folderPermission(
  handle: FileSystemDirectoryHandle,
): Promise<PermissionState> {
  if (!handle.queryPermission) return 'granted';
  return handle.queryPermission({ mode: 'read' });
}

/**
 * Picks a folder and keeps it for later sessions. The handle goes to IndexedDB, the only place a
 * browser lets a directory handle survive a reload. Picking again replaces the record, which is how
 * "change folder" works without unbinding first. Returns null when the user cancels.
 */
export async function bindFolder(): Promise<BoundFolder | null> {
  if (!window.showDirectoryPicker) return null;
  let handle: FileSystemDirectoryHandle;
  try {
    handle = await window.showDirectoryPicker({ id: 'lembaran-folder', mode: 'read' });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null;
    throw error;
  }

  const folder: BoundFolder = { id: BOUND, name: handle.name, handle, boundAt: Date.now() };
  await db.folders.put(folder);
  return folder;
}

export async function loadBoundFolder(): Promise<BoundFolder | null> {
  try {
    const folder = await db.folders.get(BOUND);
    return folder?.handle ? folder : null;
  } catch {
    return null;
  }
}

export async function unbindFolder(): Promise<void> {
  await db.folders.delete(BOUND);
}

/**
 * Lists what the folder holds that a reader can open, subfolders included. Nothing is read until a
 * file is opened — the walk keeps handles, not bytes — and it is bounded by depth and by file count,
 * so a folder that turns out to be a home directory cannot hang the tab.
 */
export async function listFolder(
  handle: FileSystemDirectoryHandle,
  extensions: readonly string[],
  limit = FOLDER_FILE_LIMIT,
): Promise<FolderFile[]> {
  const found: FolderFile[] = [];

  const walk = async (
    directory: FileSystemDirectoryHandle,
    prefix: string,
    depth: number,
  ): Promise<void> => {
    if (depth > FOLDER_DEPTH_LIMIT || found.length >= limit) return;
    const children: FileSystemDirectoryHandle[] = [];
    const labels: string[] = [];

    for await (const entry of directory.values()) {
      if (found.length >= limit) break;
      const path = prefix.length === 0 ? entry.name : `${prefix}/${entry.name}`;
      if (entry.name.startsWith('.')) continue;
      if (entry.kind === 'directory') {
        children.push(entry as FileSystemDirectoryHandle);
        labels.push(path);
        continue;
      }
      if (!shouldListPath(path, extensions)) continue;
      try {
        const fileHandle = await directory.getFileHandle(entry.name);
        const file = await fileHandle.getFile();
        found.push({
          name: entry.name,
          path,
          extension: entry.name.slice(entry.name.lastIndexOf('.') + 1).toLowerCase(),
          size: file.size,
          modifiedAt: file.lastModified,
          handle: fileHandle,
        });
      } catch {
        // a file that vanished between listing and reading is simply not offered
      }
    }

    for (const [index, child] of children.entries()) {
      if (found.length >= limit) return;
      try {
        await walk(child, labels[index] ?? '', depth + 1);
      } catch {
        // a subfolder the browser will not open is skipped, not fatal
      }
    }
  };

  await walk(handle, '', 0);
  return sortFolderFiles(found);
}

/**
 * The fallback path: no directory handle, so the folder is a one-off pick and is not remembered.
 * `webkitRelativePath` is what makes subfolders visible here — the input walks the tree itself.
 */
export function pickFolderFallback(extensions: readonly string[]): Promise<FolderFile[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.setAttribute('webkitdirectory', '');
    input.style.display = 'none';
    const done = (files: File[]) => {
      input.remove();
      const rows = files.flatMap<FolderFile>((file) => {
        const relative = file.webkitRelativePath || file.name;
        // the picked folder's own name is not part of the path a user thinks in
        const path = relative.includes('/') ? relative.slice(relative.indexOf('/') + 1) : relative;
        if (!shouldListPath(path, extensions)) return [];
        return [
          {
            name: file.name,
            path,
            extension: file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase(),
            size: file.size,
            modifiedAt: file.lastModified,
            file,
          },
        ];
      });
      resolve(sortFolderFiles(rows).slice(0, FOLDER_FILE_LIMIT));
    };
    input.addEventListener('change', () => done([...(input.files ?? [])]), { once: true });
    input.addEventListener('cancel', () => done([]), { once: true });
    document.body.append(input);
    input.click();
  });
}

/** Bytes for one listing entry, wherever they came from. */
export async function readFolderFile(entry: FolderFile): Promise<Uint8Array> {
  if (entry.file) return new Uint8Array(await entry.file.arrayBuffer());
  if (!entry.handle) throw new Error(`${entry.name}: this listing carried no file to read`);
  const file = await entry.handle.getFile();
  return new Uint8Array(await file.arrayBuffer());
}
