import { CloudError, type CloudEntry } from './types';

/** Graph takes a whole file in one `PUT` up to 250 MB, but this app keeps it small: above 4 MB, chunks. */
export const SIMPLE_UPLOAD_LIMIT = 4 * 1024 * 1024;

/** 10 MiB is exactly 32 × 320 KiB, and Graph requires a multiple of 320 KiB per chunk. */
export const UPLOAD_CHUNK = 10 * 1024 * 1024;

/** The item shape Graph returns, reduced to what a listing needs. */
export interface GraphItem {
  id: string;
  name: string;
  size?: number;
  eTag?: string;
  lastModifiedDateTime?: string;
  file?: { mimeType?: string };
  folder?: { childCount?: number };
}

export interface GraphPage {
  value?: GraphItem[];
  '@odata.nextLink'?: string;
}

/** One chunk of an upload session: inclusive byte range, as the `Content-Range` header wants it. */
export function uploadChunks(total: number, chunkSize = UPLOAD_CHUNK): Array<{ start: number; end: number }> {
  const size = Math.max(320 * 1024, Math.min(chunkSize, 60 * 1024 * 1024));
  const ranges: Array<{ start: number; end: number }> = [];
  for (let start = 0; start < total; start += size) {
    ranges.push({ start, end: Math.min(total, start + size) - 1 });
  }
  return ranges;
}

/** An item as the folder browser wants it. */
export function toEntry(item: GraphItem): CloudEntry {
  const modified = item.lastModifiedDateTime ? Date.parse(item.lastModifiedDateTime) : 0;
  return {
    id: item.id,
    name: item.name,
    folder: item.folder !== undefined,
    size: item.size ?? 0,
    modifiedAt: Number.isFinite(modified) ? modified : 0,
    etag: item.eTag ?? '',
  };
}

/**
 * One page of a listing added to what is already collected: ids collapse (a page can repeat an item when the
 * folder changes under the walk) and the cap is honoured, so a folder cannot grow into a hang.
 */
export function collectPage(
  collected: readonly CloudEntry[],
  page: readonly GraphItem[],
  limit: number,
): CloudEntry[] {
  const next = [...collected];
  const seen = new Set(next.map((entry) => entry.id));
  for (const item of page) {
    if (next.length >= limit) break;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    next.push(toEntry(item));
  }
  return next;
}

/** The five HTTP answers that matter, as the kinds a caller can act on. */
/** The subset of a Graph drive the hub uses. */
export interface DriveShape {
  id: string;
  name?: string;
  driveType?: string;
}

/**
 * Graph lists every drive an account can reach, and a personal account answers `/me/drives` with a pile of
 * auxiliary "personal" drives — GUID-named ones, `Bundles_…`, `ODCMetadataArchive` — which are not places a person
 * keeps documents. Only the default drive and real document libraries are worth showing.
 */
export function primaryDrives(defaultDrive: DriveShape | null, all: readonly DriveShape[]): DriveShape[] {
  const seen = new Set<string>();
  const out: DriveShape[] = [];
  const push = (drive: DriveShape | null) => {
    if (!drive || drive.id.length === 0 || seen.has(drive.id)) return;
    seen.add(drive.id);
    out.push(drive);
  };
  push(defaultDrive);
  for (const drive of all) {
    if (drive.driveType === 'personal') continue;
    push(drive);
  }
  return out;
}

export function toDrive(drive: DriveShape): {
  id: string;
  name: string;
  kind: 'personal' | 'business' | 'documentLibrary';
} {
  return {
    id: drive.id,
    name: drive.name ?? 'OneDrive',
    kind:
      drive.driveType === 'personal'
        ? 'personal'
        : drive.driveType === 'documentLibrary'
          ? 'documentLibrary'
          : 'business',
  };
}

export function cloudErrorFor(status: number, headers?: Headers, detail?: string): CloudError {
  const suffix = detail ? ` ${detail}` : '';
  if (status === 401) {
    return new CloudError('unauthorised', `OneDrive refused the request — sign in again.${suffix}`);
  }
  if (status === 403) {
    // the usual cause is a registration that was never given Files.ReadWrite, not a broken sign-in
    return new CloudError(
      'unauthorised',
      `OneDrive refused: the app registration is missing a delegated permission (Files.ReadWrite).${suffix}`,
    );
  }
  if (status === 409 || status === 412) {
    return new CloudError('conflict', 'The copy in OneDrive is not the one this window opened.');
  }
  if (status === 429 || status === 503) {
    const seconds = Number(headers?.get('Retry-After') ?? '');
    return new CloudError(
      'throttled',
      'OneDrive asked for a slower pace. Try again in a moment.',
      Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 2000,
    );
  }
  if (status === 404) return new CloudError('unsupported', 'That item is no longer in the drive.');
  return new CloudError('unsupported', `OneDrive answered ${status}.${suffix}`);
}
