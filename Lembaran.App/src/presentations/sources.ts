import type { RecentEntry } from '@lembaran/framework';

/** Where a document or a folder came from. Google Drive joins when a provider registry exists. */
export type SourceKind = 'local' | 'onedrive' | 'opfs';

export const SOURCE_LABEL: Record<SourceKind, string> = {
  local: 'Local',
  onedrive: 'OneDrive',
  opfs: 'OPFS',
};

/** the folder's own source, which the hub models as this pair */
export function folderSource(source: 'local' | 'onedrive' | null): SourceKind {
  return source === 'onedrive' ? 'onedrive' : 'local';
}

/**
 * A recent remembers how it arrived: a file on disk (a handle), a file in a drive (a cloud reference), or neither —
 * a drop or a picker without handles, whose bytes live only in the copy Lembaran keeps in browser storage.
 */
export function recentSource(entry: RecentEntry): SourceKind {
  if (entry.cloud) return 'onedrive';
  if (entry.handle) return 'local';
  return 'opfs';
}
