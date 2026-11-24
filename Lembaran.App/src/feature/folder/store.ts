import { useCallback, useEffect, useRef, useState } from 'react';
import {
  bindFolder,
  clearCloudFolder,
  clearSignInReturn,
  cloudAccount,
  cloudConfigured,
  cloudFiles,
  cloudFolders,
  cloudSignIn,
  cloudSignInError,
  cloudSignInResponse,
  cloudSignOut,
  consumeSignInReturn,
  ensureFolderPermission,
  folderPermission,
  hasDirectoryPicker,
  listChildren,
  listDrives,
  listFolder,
  loadBoundFolder,
  loadCloudFolder,
  pickFolderFallback,
  readableCloudEntries,
  saveCloudFolder,
  settleSignInUrl,
  unbindFolder,
  type BoundFolder,
  type CloudAccount,
  type CloudDrive,
  type CloudEntry,
  type CloudFolderRef,
  type FolderFile,
} from '@lembaran/framework';
import { READERS } from '../choose';

export type FolderSource = 'local' | 'onedrive';

export type FolderState =
  /** no folder bound yet */
  | 'empty'
  /** bound, but this session has to be granted permission again — one click, inside a gesture */
  | 'needs-permission'
  /** bound and listed */
  | 'ready'
  /** bound on a browser that cannot remember a directory: this listing lives until reload */
  | 'transient'
  | 'loading'
  /** a drive folder is bound, but the account is signed out */
  | 'drive-signed-out'
  /** the token was refused: a fresh sign-in is needed, and the reason is shown */
  | 'drive-expired'
  | 'drive-signing-in'
  /** choosing a folder inside the drive */
  | 'drive-browsing';

/** What the drive panel draws: the drives as a starting point, then the folders stepped into. */
export interface DriveView {
  drives: CloudDrive[];
  /** null while the drive list itself is on screen */
  driveId: string | null;
  driveName: string;
  /** the folder the panel was opened at, then every folder stepped into under it */
  stack: Array<{ id: string; name: string }>;
  folders: CloudEntry[];
  files: FolderFile[];
  /** true while choosing a folder to bind, false while browsing the one that is bound */
  choosing: boolean;
}

export interface BoundFolderApi {
  state: FolderState;
  source: FolderSource | null;
  folder: BoundFolder | null;
  driveFolder: CloudFolderRef | null;
  account: CloudAccount | null;
  files: FolderFile[];
  error: string | null;
  /** false on Firefox and iOS, where the folder is a one-off pick */
  canBind: boolean;
  /** this build carries a client id, so OneDrive can be offered at all */
  cloudReady: boolean;
  /** set while a drive folder is bound or being chosen */
  driveView: DriveView | null;
  bind(): Promise<void>;
  chooseDrive(): Promise<void>;
  /** close the "which folder?" dialog without binding anything */
  cancelDrivePicker(): void;
  /** sign in as a different account; the folder bound to the old one is released */
  addAccount(): Promise<void>;
  signIn(): Promise<void>;
  /** give up waiting on the sign-in window without waiting for it to close */
  cancelSignIn(): void;
  signOut(): Promise<void>;
  reconnect(): Promise<void>;
  release(): Promise<void>;
  openDriveFolder(entry: CloudEntry): Promise<void>;
  driveParent(): Promise<void>;
  /** stand at a depth of the panel: ‑1 the drive list, 0 the folder it opened at, n the n-th step */
  driveTo(depth: number): Promise<void>;
  bindHere(): Promise<void>;
}

/** Every extension a built reader accepts — the folder shows exactly what the app can open. */
export const READABLE_EXTENSIONS: readonly string[] = [
  ...new Set(READERS.filter((entry) => entry.available).flatMap((entry) => entry.extensions)),
];

const CLOUD_LIMIT = 300;

/** how long a sign-in window is waited on before giving the section back to the user */
const SIGN_IN_LIMIT = 120_000;

function messageOf(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

/**
 * One folder, from either place: a directory on this device, or a folder inside OneDrive. The hub draws the same
 * rows for both; a drive adds a sign-in step and can be walked one level at a time, because a drive has no cheap
 * recursive listing the way a directory handle does.
 */
export function useBoundFolder(): BoundFolderApi {
  const [folder, setFolder] = useState<BoundFolder | null>(null);
  const [files, setFiles] = useState<FolderFile[]>([]);
  const [state, setState] = useState<FolderState>('loading');
  const [error, setError] = useState<string | null>(null);

  const [account, setAccount] = useState<CloudAccount | null>(null);
  const [driveFolder, setDriveFolder] = useState<CloudFolderRef | null>(null);
  const [driveView, setDriveView] = useState<DriveView | null>(null);

  /** where the drive panel is standing; a ref, because several actions need it without re-rendering */
  const place = useRef<{
    driveId: string;
    driveName: string;
    itemId: string;
    name: string;
    stack: Array<{ id: string; name: string }>;
    choosing: boolean;
  } | null>(null);

  /** true on the page that came back from the sign-in redirect, while the drive panel is still to be reopened */
  const resumeChooser = useRef(false);

  const list = useCallback(async (handle: FileSystemDirectoryHandle) => {
    const listing = await listFolder(handle, READABLE_EXTENSIONS);
    setFiles(listing);
    setState('ready');
  }, []);

  /** Lists one drive folder and puts it on screen. */
  const showDriveFolder = useCallback(
    async (
      driveId: string,
      driveName: string,
      itemId: string,
      name: string,
      stack: Array<{ id: string; name: string }>,
      choosing: boolean,
      drives: CloudDrive[] = [],
    ) => {
      const entries = readableCloudEntries(
        await listChildren(driveId, itemId === '' ? null : itemId, CLOUD_LIMIT),
        READABLE_EXTENSIONS,
      );
      place.current = { driveId, driveName, itemId, name, stack, choosing };
      const rows = cloudFiles(entries, driveId);
      setDriveView({ drives, driveId, driveName, stack, folders: cloudFolders(entries), files: rows, choosing });
      setFiles(rows);
      setState(choosing ? 'drive-browsing' : 'ready');
    },
    [],
  );

  // ---- first look: the local folder, and whatever drive folder was bound last time

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await loadBoundFolder();
      const cloudFolder = await loadCloudFolder();
      // the page may be the return from a sign-in redirect: the response has to be taken before anything else,
      // and the drive panel it was heading for has to be reopened
      resumeChooser.current = consumeSignInReturn();
      const returning = resumeChooser.current || cloudSignInResponse();
      const known = cloudFolder || returning ? await cloudAccount() : null;
      // the response has been presented to the library once; it must not sit in the address bar afterwards
      if (returning) settleSignInUrl();
      if (cancelled) return;

      if (cloudFolder) {
        setDriveFolder(cloudFolder);
        setAccount(known);
        if (!known) {
          setState('drive-signed-out');
          return;
        }
        try {
          await showDriveFolder(cloudFolder.driveId, cloudFolder.driveName, cloudFolder.itemId, cloudFolder.name, [
            { id: cloudFolder.itemId, name: cloudFolder.name },
          ], false);
        } catch (reason) {
          setError(messageOf(reason));
          setState('drive-expired');
        }
        return;
      }

      if (known) {
        // signed in from the card, on the way to choosing a folder
        setAccount(known);
        setState('empty');
        return;
      }

      if (returning) {
        // the page is the return from a sign-in that produced nothing: say why instead of showing the card again
        const refused = cloudSignInError();
        setError(
          refused
            ? `Microsoft refused the sign-in (${refused}). Nothing was connected.`
            : 'The sign-in came back without an account. Check that this address is registered as a Single-page application redirect URI, then try again.',
        );
        setState('empty');
        return;
      }

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
  }, [list, showDriveFolder]);

  // ---- local actions (the behaviour that was already here)

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
        // one folder at a time: binding a directory lets go of the drive folder
        await clearCloudFolder().catch(() => undefined);
        setDriveFolder(null);
        setDriveView(null);
        setFolder(picked);
        await list(picked.handle);
        return;
      }
      const picked = await pickFolderFallback(READABLE_EXTENSIONS);
      setFiles(picked);
      setState(picked.length > 0 ? 'transient' : 'empty');
    } catch (reason) {
      setError(messageOf(reason));
      setState(folder ? 'needs-permission' : 'empty');
    }
  }, [folder, list]);

  const reconnect = useCallback(async () => {
    setError(null);
    if (driveFolder) {
      const known = await cloudAccount();
      if (!known) {
        setState('drive-signed-out');
        return;
      }
      setAccount(known);
      try {
        await showDriveFolder(driveFolder.driveId, driveFolder.driveName, driveFolder.itemId, driveFolder.name, [
          { id: driveFolder.itemId, name: driveFolder.name },
        ], false);
      } catch (reason) {
        setError(messageOf(reason));
        setState('drive-expired');
      }
      return;
    }
    if (!folder) return;
    const permission = await ensureFolderPermission(folder.handle);
    if (permission !== 'granted') {
      setState('needs-permission');
      return;
    }
    try {
      await list(folder.handle);
    } catch (reason) {
      setError(messageOf(reason));
      setState('needs-permission');
    }
  }, [driveFolder, folder, list, showDriveFolder]);

  const release = useCallback(async () => {
    if (driveFolder) {
      await clearCloudFolder().catch(() => undefined);
      setDriveFolder(null);
      setDriveView(null);
      setFiles([]);
      setError(null);
      setState('empty');
      return;
    }
    await unbindFolder().catch(() => undefined);
    setFolder(null);
    setFiles([]);
    setError(null);
    setState('empty');
  }, [driveFolder]);

  // ---- drive actions

  /**
   * MSAL settles when its popup closes, but a popup the browser blocked, or one left open and abandoned, settles
   * never — and the section would sit on "Signing in…" with no way out. The wait is therefore bounded, and Cancel
   * ends it at once.
   */
  const signInWait = useRef<{ timer: number; cancel(reason: Error): void } | null>(null);

  const waitForSignIn = useCallback(async (chooseAccount = false): Promise<CloudAccount> => {
    const gate = new Promise<never>((_, reject) => {
      const timer = window.setTimeout(() => {
        signInWait.current = null;
        reject(new Error('The sign-in window did not finish. Close it, then try again.'));
      }, SIGN_IN_LIMIT);
      signInWait.current = {
        timer,
        cancel: (reason) => {
          window.clearTimeout(timer);
          signInWait.current = null;
          reject(reason);
        },
      };
    });
    try {
      return await Promise.race([cloudSignIn({ chooseAccount }), gate]);
    } finally {
      if (signInWait.current) window.clearTimeout(signInWait.current.timer);
      signInWait.current = null;
    }
  }, []);

  const cancelSignIn = useCallback(() => {
    clearSignInReturn();
    signInWait.current?.cancel(new Error('Sign-in was cancelled.'));
  }, []);

  /** Sign in, then go back to whatever the panel was showing. */
  const signIn = useCallback(async () => {
    setError(null);
    setState('drive-signing-in');
    try {
      const signed = await waitForSignIn();
      setAccount(signed);
      const target = driveFolder ?? place.current;
      if (target) {
        await showDriveFolder(
          target.driveId,
          'driveName' in target ? target.driveName : '',
          target.itemId,
          target.name,
          'stack' in target ? target.stack : [{ id: target.itemId, name: target.name }],
          'choosing' in target ? target.choosing : false,
        );
        return;
      }
      setState('empty');
    } catch (reason) {
      setError(messageOf(reason));
      setState('drive-signed-out');
    }
  }, [driveFolder, showDriveFolder]);

  const cancelDrivePicker = useCallback(() => {
    setError(null);
    place.current = null;
    setDriveView(null);
    setFiles([]);
    if (driveFolder) {
      void showDriveFolder(
        driveFolder.driveId,
        driveFolder.driveName,
        driveFolder.itemId,
        driveFolder.name,
        [{ id: driveFolder.itemId, name: driveFolder.name }],
        false,
      );
      return;
    }
    setState(folder ? 'ready' : 'empty');
  }, [driveFolder, folder, showDriveFolder]);

  /** Sign in as someone else: the account chooser comes first, and one account is in use at a time. */
  const addAccount = useCallback(async () => {
    setError(null);
    setState('drive-signing-in');
    try {
      const signed = await waitForSignIn(true);
      // the folder that was bound belongs to the account that is being left, so it is let go here
      await clearCloudFolder().catch(() => undefined);
      setDriveFolder(null);
      setDriveView(null);
      setFiles([]);
      setAccount(signed);
      setState('empty');
    } catch (reason) {
      setError(messageOf(reason));
      setState('drive-signed-out');
    }
  }, [waitForSignIn]);

  const signOut = useCallback(async () => {
    await cloudSignOut().catch(() => undefined);
    setAccount(null);
    setDriveFolder(null);
    setDriveView(null);
    setFiles([]);
    setState(folder ? 'ready' : 'empty');
  }, [folder]);

  /** Open the drive panel at the list of drives, ready to choose a folder. Signs in when needed. */
  const chooseDrive = useCallback(async () => {
    setError(null);
    if (!cloudConfigured()) {
      setError('This build has no OneDrive client id, so a drive cannot be connected.');
      return;
    }
    let known = account;
    if (!known) {
      setState('drive-signing-in');
      try {
        known = await waitForSignIn();
        setAccount(known);
      } catch (reason) {
        setError(messageOf(reason));
        setState('drive-signed-out');
        return;
      }
    }
    setState('drive-browsing');
    try {
      const drives = await listDrives();
      place.current = null;
      setDriveView({ drives, driveId: null, driveName: '', stack: [], folders: [], files: [], choosing: true });
      setFiles([]);
    } catch (reason) {
      setError(messageOf(reason));
      setState('drive-expired');
    }
  }, [account]);

  // the page this ran on is the return from the sign-in redirect: carry on into the folder chooser
  useEffect(() => {
    if (!resumeChooser.current || !account) return;
    resumeChooser.current = false;
    void chooseDrive();
  }, [account, chooseDrive]);

  const openDriveFolder = useCallback(
    async (entry: CloudEntry) => {
      const view = driveView;
      if (!view) return;
      setError(null);
      try {
        if (view.driveId === null) {
          // a drive was picked from the list: its root is the first folder
          await showDriveFolder(entry.id, entry.name, '', entry.name, [], view.choosing, view.drives);
          return;
        }
        await showDriveFolder(
          view.driveId,
          view.driveName,
          entry.id,
          entry.name,
          [...view.stack, { id: entry.id, name: entry.name }],
          view.choosing,
          view.drives,
        );
      } catch (reason) {
        setError(messageOf(reason));
        setState('drive-expired');
      }
    },
    [driveView, showDriveFolder],
  );

  /**
   * Stand at a depth of the drive panel: ‑1 is the list of drives (while choosing), 0 is the folder the panel was
   * opened at, and n is the n-th folder stepped into. One function, because a crumb, an "up" and a parent are the
   * same move to a different depth.
   */
  const driveTo = useCallback(
    async (depth: number) => {
      const view = driveView;
      if (!view) return;
      setError(null);
      if (depth < 0) {
        if (!view.choosing) return;
        place.current = null;
        setDriveView({ ...view, driveId: null, driveName: '', stack: [], folders: [], files: [] });
        setFiles([]);
        return;
      }
      if (view.driveId === null || view.stack.length === 0) return;
      const stack = view.stack.slice(0, depth + 1);
      const step = stack[stack.length - 1];
      if (!step) return;
      try {
        await showDriveFolder(view.driveId, view.driveName, step.id, step.name, stack, view.choosing, view.drives);
      } catch (reason) {
        setError(messageOf(reason));
        setState('drive-expired');
      }
    },
    [driveView, showDriveFolder],
  );

  const driveParent = useCallback(async () => {
    const view = driveView;
    if (!view) return;
    await driveTo(view.stack.length - 2);
  }, [driveTo, driveView]);

  /** Bind the folder the panel is standing in. */
  const bindHere = useCallback(async () => {
    const view = driveView;
    const at = place.current;
    if (!view || !at || !view.driveId) return;
    setError(null);
    const bound: CloudFolderRef = {
      driveId: view.driveId,
      driveName: view.driveName,
      itemId: at.itemId,
      name: at.name || view.driveName,
      path: [view.driveName, ...at.stack.map((step) => step.name)].join('/'),
    };
    try {
      await saveCloudFolder(bound);
      await unbindFolder().catch(() => undefined);
      setFolder(null);
      setDriveFolder(bound);
      await showDriveFolder(bound.driveId, bound.driveName, bound.itemId, bound.name, [{ id: bound.itemId, name: bound.name }], false);
    } catch (reason) {
      setError(messageOf(reason));
    }
  }, [driveView, showDriveFolder]);

  const source: FolderSource | null = driveFolder ? 'onedrive' : folder ? 'local' : null;

  return {
    state,
    source,
    folder,
    driveFolder,
    account,
    files,
    error,
    canBind: hasDirectoryPicker(),
    cloudReady: cloudConfigured(),
    driveView,
    bind,
    chooseDrive,
    cancelDrivePicker,
    addAccount,
    signIn,
    cancelSignIn,
    signOut,
    reconnect,
    release,
    openDriveFolder,
    driveParent,
    driveTo,
    bindHere,
  };
}
