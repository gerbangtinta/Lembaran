import { db } from '../handles/store';
import type { CloudAccount, CloudFolderRef } from './types';

/**
 * The session and the bound drive folder, kept beside the local folder record. Nothing here is a token:
 * the OAuth client keeps those, and this is only what the UI needs to say "connected as …".
 */
export async function loadCloudSession(): Promise<CloudAccount | null> {
  try {
    return (await db.cloudSession.get('current'))?.account ?? null;
  } catch {
    return null;
  }
}

export async function saveCloudSession(account: CloudAccount): Promise<void> {
  await db.cloudSession.put({ id: 'current', account, lastUsedAt: Date.now() });
}

export async function clearCloudSession(): Promise<void> {
  await db.cloudSession.delete('current').catch(() => undefined);
}

export async function loadCloudFolder(): Promise<CloudFolderRef | null> {
  try {
    const row = await db.cloudFolder.get('bound');
    if (!row) return null;
    return {
      driveId: row.driveId,
      driveName: row.driveName,
      itemId: row.itemId,
      name: row.name,
      path: row.path,
    };
  } catch {
    return null;
  }
}

export async function saveCloudFolder(folder: CloudFolderRef): Promise<void> {
  await db.cloudFolder.put({ id: 'bound', ...folder, boundAt: Date.now() });
}

export async function clearCloudFolder(): Promise<void> {
  await db.cloudFolder.delete('bound').catch(() => undefined);
}
