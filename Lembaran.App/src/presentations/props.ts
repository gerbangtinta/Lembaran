import type { FolderFile, RecentEntry } from '@lembaran/framework';
import type { BoundFolderApi } from '../feature/folder';
import type { ReaderEntry, ReaderId } from '../feature/choose';

/** Everything a hub shell needs. Desktop and phone layouts take the same props and share no markup. */
export interface HubShellProps {
  entries: readonly ReaderEntry[];
  recents: RecentEntry[];
  busyId: ReaderId | null;
  error: string | null;
  folder: BoundFolderApi;
  onLaunch(entry: ReaderEntry): void;
  onOpenRecent(entry: RecentEntry): void;
  /** no confirmation: a recent is a shortcut, not the file */
  onRemoveRecent(id: string): void;
  /** forgets every recent and reclaims the copies Lembaran stored on this device */
  onClearRecents(): void;
  onOpenFolderFile(entry: FolderFile): void;
  onDismissError(): void;
}
