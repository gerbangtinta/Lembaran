import { extensionOf } from '../files/pick';

/** A file the bound folder offers, before its bytes are read. */
export interface FolderFile {
  name: string;
  /** path inside the bound folder, `/`-separated; equals `name` at the top level */
  path: string;
  extension: string;
  size: number;
  modifiedAt: number;
  /** Absent on the fallback path, where the browser handed us a `File` and no directory handle. */
  handle?: FileSystemFileHandle;
  /** Present only on the fallback path: the bytes are already in hand. */
  file?: File;
}

/** How many files a listing will show before it stops; a folder of ten thousand is not a library. */
export const FOLDER_FILE_LIMIT = 300;

/** How deep the walk goes. A document library is shallow; a disk image is not a library. */
export const FOLDER_DEPTH_LIMIT = 8;

/**
 * Whether a path inside the folder is worth listing: a known extension, no dot-file, no Office lock,
 * and no hidden directory on the way. Pure, so the rule is testable without a browser.
 */
export function shouldListPath(path: string, extensions: readonly string[]): boolean {
  const segments = path.split('/');
  const name = segments[segments.length - 1] ?? '';
  if (name.length === 0 || segments.some((segment) => segment.startsWith('.'))) return false;
  if (name.startsWith('~$')) return false;
  const wanted = new Set(extensions.map((extension) => extension.toLowerCase()));
  return wanted.has(extensionOf(name));
}

export function comparePaths(left: string, right: string): number {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
}

/** The listing rule applied to a flat set of paths, in display order. */
export function eligiblePaths(
  paths: readonly string[],
  extensions: readonly string[],
  limit = FOLDER_FILE_LIMIT,
): string[] {
  return paths.filter((path) => shouldListPath(path, extensions)).sort(comparePaths).slice(0, limit);
}

export function sortFolderFiles(files: readonly FolderFile[]): FolderFile[] {
  return [...files].sort((left, right) => comparePaths(left.path, right.path));
}

/** One level of the folder: the subfolders you can step into, and the files that live here. */
export interface FolderView {
  folders: string[];
  files: FolderFile[];
}

/**
 * The listing as a browser shows it: `path` is the directory being viewed ('' is the bound folder
 * itself), `folders` are the immediate subfolder names and `files` the ones directly inside it.
 * Derived from the one recursive listing, so stepping into a folder never touches the disk again.
 */
export function folderView(files: readonly FolderFile[], path: string): FolderView {
  const prefix = path.length === 0 ? '' : `${path}/`;
  const folders = new Set<string>();
  const here: FolderFile[] = [];

  for (const file of files) {
    if (prefix.length > 0 && !file.path.startsWith(prefix)) continue;
    const rest = file.path.slice(prefix.length);
    const slash = rest.indexOf('/');
    if (slash === -1) here.push(file);
    else folders.add(rest.slice(0, slash));
  }

  here.sort((left, right) => comparePaths(left.name, right.name));
  return { folders: [...folders].sort(comparePaths), files: here };
}

/** `reports/2024` → `['reports', '2024']`; '' → `[]`. */
export function pathSegments(path: string): string[] {
  return path.length === 0 ? [] : path.split('/');
}

/** How many folders hold documents, and how many of each extension — the counts a tooltip shows. */
export function folderCounts(files: readonly FolderFile[]): {
  folders: number;
  byExtension: Record<string, number>;
} {
  const directories = new Set<string>();
  const byExtension: Record<string, number> = {};
  for (const file of files) {
    const cut = file.path.length - file.name.length;
    if (cut > 0) directories.add(file.path.slice(0, cut - 1));
    byExtension[file.extension] = (byExtension[file.extension] ?? 0) + 1;
  }
  return { folders: directories.size, byExtension };
}

export interface FolderSearch {
  /** folder paths whose own name matches, so a search can take you into a folder */
  folders: Array<{ name: string; path: string }>;
  /** files whose path matches, wherever they sit in the tree */
  files: FolderFile[];
}

/** Anything the query names, wherever it lives: folders to step into, and documents to open. */
export function searchFolder(
  files: readonly FolderFile[],
  query: string,
  limit = 60,
): FolderSearch {
  const wanted = query.trim().toLowerCase();
  if (wanted.length === 0) return { folders: [], files: [] };

  const folders = new Map<string, string>();
  for (const file of files) {
    const segments = file.path.split('/');
    segments.pop();
    let path = '';
    for (const segment of segments) {
      path = path.length === 0 ? segment : `${path}/${segment}`;
      if (segment.toLowerCase().includes(wanted)) folders.set(path, segment);
    }
  }

  const matched = files.filter((file) => file.path.toLowerCase().includes(wanted));
  return {
    folders: [...folders]
      .map(([path, name]) => ({ path, name }))
      .sort((left, right) => comparePaths(left.path, right.path))
      .slice(0, limit),
    files: [...matched].sort((left, right) => comparePaths(left.path, right.path)).slice(0, limit),
  };
}

