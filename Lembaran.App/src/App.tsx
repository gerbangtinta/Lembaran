import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FolderFile, RecentEntry } from '@lembaran/framework';
import { useIsMobile } from '@lembaran/ui';
import { READERS, readerForFileName, type ReaderEntry, type ReaderId } from './feature/choose';
import { useBoundFolder } from './feature/folder';
import {
  clearOpenDocument,
  frameUrl,
  handoffFromFile,
  handoffFromFolderFile,
  loadOpenDocument,
  openForReader,
  saveOpenDocument,
  type Handoff,
} from './feature/embed';
import { useRecents } from './feature/recents';
import { HubShell } from './presentations/layout/HubShell';
import { HubMobileShell } from './presentations/mobile/HubMobileShell';
import { ReaderFrame } from './presentations/component/ReaderFrame';

/** The document the user had open, if the reader still exists and is still built. */
function restore(): Handoff | null {
  const open = loadOpenDocument();
  if (!open) return null;
  const reader = READERS.find((entry) => entry.id === open.readerId && entry.available);
  return reader ? { reader, path: open.path, name: open.name } : null;
}

export function HubApp() {
  const [handoff, setHandoff] = useState<Handoff | null>(useMemo(restore, []));
  const [busyId, setBusyId] = useState<ReaderId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { recents, refresh, remove: removeRecent, clear: clearRecents } = useRecents();
  const folder = useBoundFolder();
  const mobile = useIsMobile();

  // a reload — including the full reload Vite sends when a reader's entry module changes —
  // reopens the document instead of dropping the user on the launcher
  useEffect(() => {
    if (!handoff) {
      clearOpenDocument();
      return;
    }
    saveOpenDocument({ readerId: handoff.reader.id, path: handoff.path, name: handoff.name });
  }, [handoff]);

  const launch = useCallback(
    async (entry: ReaderEntry) => {
      if (!entry.available) {
        setError(`${entry.name} is not built yet. The plan builds it after the one before it.`);
        return;
      }
      setBusyId(entry.id);
      setError(null);
      try {
        const result = await openForReader(entry);
        if (result) {
          setHandoff(result);
          refresh();
        }
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : String(reason));
      } finally {
        setBusyId(null);
      }
    },
    [refresh],
  );

  const openRecent = useCallback((recent: RecentEntry) => {
    const reader = readerForFileName(recent.name);
    if (!reader) {
      setError(`${recent.name}: no reader knows that file type.`);
      return;
    }
    if (!reader.available) {
      setError(`${reader.name} is not built yet.`);
      return;
    }
    setHandoff({ reader, path: recent.path, name: recent.name });
  }, []);

  const openFolderFile = useCallback(
    async (file: FolderFile) => {
      const reader = readerForFileName(file.name);
      if (!reader || !reader.available) {
        setError(`${file.name}: no reader for that file type.`);
        return;
      }
      setBusyId(reader.id);
      setError(null);
      try {
        setHandoff(await handoffFromFolderFile(file, reader));
        refresh();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : String(reason));
      } finally {
        setBusyId(null);
      }
    },
    [refresh],
  );

  const dropFiles = useCallback(
    async (files: FileList) => {
      const file = files[0];
      if (!file) return;
      const reader = readerForFileName(file.name);
      if (!reader || !reader.available) {
        setError(`${file.name}: no reader for that file type yet.`);
        return;
      }
      try {
        setHandoff(await handoffFromFile(file, reader));
        refresh();
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : String(reason));
      }
    },
    [refresh],
  );

  if (handoff) {
    return (
      <ReaderFrame
        url={frameUrl(handoff)}
        title={handoff.name}
        onClose={() => setHandoff(null)}
      />
    );
  }

  const shellProps = {
    entries: READERS,
    recents,
    busyId,
    error,
    folder,
    onLaunch: (entry: ReaderEntry) => void launch(entry),
    onOpenRecent: openRecent,
    onRemoveRecent: removeRecent,
    onClearRecents: clearRecents,
    onOpenFolderFile: (file: FolderFile) => void openFolderFile(file),
    onDismissError: () => setError(null),
  };

  return (
    <div
      className="hub-dropzone"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        void dropFiles(event.dataTransfer.files);
      }}
    >
      {mobile ? <HubMobileShell {...shellProps} /> : <HubShell {...shellProps} />}
    </div>
  );
}
