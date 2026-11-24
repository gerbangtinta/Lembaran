import type { CloudAccount, CloudDrive, CloudEntry } from './types';
import { CloudError } from './types';
import { cloudConfig } from './config';

/**
 * A drive that lives in memory, so the whole path — bind, list, open, save, conflict — can be walked without a
 * tenant. It is loaded only when the app primes `fake: true` (`?drive=fake` in development).
 */
export function fakeEnabled(): boolean {
  return cloudConfig().fake;
}

export const fakeAccount: CloudAccount = {
  id: 'fake-home-account',
  name: 'Test Account',
  username: 'test.account@example.com',
  tenantId: 'fake-tenant',
};

const drives: CloudDrive[] = [
  { id: 'fake-personal', name: 'OneDrive (sample)', kind: 'personal' },
  { id: 'fake-work', name: 'Contoso (sample)', kind: 'business' },
];

const folders: Record<string, CloudEntry[]> = {
  'fake-personal:': [
    { id: 'folder-reports', name: 'Reports', folder: true, size: 0, modifiedAt: 0, etag: '' },
    { id: 'file-hello', name: 'hello.pdf', folder: false, size: 1019, modifiedAt: Date.now(), etag: 'v1' },
    { id: 'file-notes', name: 'notes.txt', folder: false, size: 12, modifiedAt: Date.now(), etag: 'v1' },
  ],
  'fake-personal:folder-reports': [
    { id: 'file-report', name: 'quarterly.pdf', folder: false, size: 1019, modifiedAt: Date.now(), etag: 'v1' },
  ],
  'fake-work:': [
    { id: 'file-hello-work', name: 'hello.pdf', folder: false, size: 1019, modifiedAt: Date.now(), etag: 'v1' },
  ],
};

/** Which version each fake item is on, so a stale `If-Match` can be answered with a conflict. */
const versions = new Map<string, string>();
/** Bytes the fake has been given by a save, so a second read sees them. */
const written = new Map<string, Uint8Array>();

function versionOf(itemId: string): string {
  const known = versions.get(itemId);
  if (known) return known;
  versions.set(itemId, 'v1');
  return 'v1';
}

/** Test hook: move an item on as if someone else had saved it, so the next write conflicts. */
export function fakeBump(itemId: string): void {
  const next = `v${Number(versionOf(itemId).slice(1)) + 1}`;
  versions.set(itemId, next);
}

export function fakeDrives(): CloudDrive[] {
  return drives;
}

export function fakeChildren(driveId: string, itemId: string | null): CloudEntry[] {
  return folders[`${driveId}:${itemId ?? ''}`] ?? [];
}

async function bytesOf(): Promise<Uint8Array> {
  const response = await fetch('/samples/hello.pdf');
  if (!response.ok) throw new CloudError('offline', 'The sample file could not be read.');
  return new Uint8Array(await response.arrayBuffer());
}

export async function fakeRead(driveId: string, itemId: string): Promise<{ bytes: Uint8Array; etag: string }> {
  void driveId;
  const stored = written.get(itemId);
  return { bytes: stored ?? (await bytesOf()), etag: versionOf(itemId) };
}

export function fakeStat(driveId: string, itemId: string): CloudEntry {
  const known = [...(folders[`${driveId}:`] ?? []), ...(folders[`${driveId}:folder-reports`] ?? [])].find(
    (entry) => entry.id === itemId,
  );
  return { ...(known ?? { id: itemId, name: 'file', folder: false, size: 0, modifiedAt: 0 }), etag: versionOf(itemId) };
}

export function fakeWrite(itemId: string, bytes: Uint8Array, etag: string): { etag: string; size: number } {
  if (etag !== versionOf(itemId)) {
    throw new CloudError('conflict', 'The copy in OneDrive is not the one this window opened.');
  }
  written.set(itemId, bytes);
  fakeBump(itemId);
  return { etag: versionOf(itemId), size: bytes.byteLength };
}

/** A global for the browser checks, so a conflict can be staged without a second account. */
if (typeof window !== 'undefined' && fakeEnabled()) {
  (window as unknown as { __fakeDrive?: unknown }).__fakeDrive = { bump: fakeBump, versions };
}
