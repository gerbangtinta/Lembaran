/** What a OneDrive document is once it is open: enough to read it again and to write it back. */
export interface CloudRef {
  provider: 'onedrive';
  driveId: string;
  itemId: string;
  /**
   * The version the bytes were read at. A write carries it as `If-Match`, so a copy that changed in the
   * meantime is reported as a conflict instead of being overwritten by whatever this tab had in memory.
   */
  etag: string;
  name: string;
}

export interface CloudAccount {
  /** MSAL's `homeAccountId` — stable across sessions, and never a token */
  id: string;
  name: string;
  /** what the account signs in as: an e-mail address, or a tenant UPN */
  username: string;
  tenantId: string;
}

/** A drive the signed-in account can see: the personal one, a work one, or a SharePoint document library. */
export interface CloudDrive {
  id: string;
  name: string;
  kind: 'personal' | 'business' | 'documentLibrary';
}

/** One row of a drive folder, before it becomes a `FolderFile`. */
export interface CloudEntry {
  id: string;
  name: string;
  folder: boolean;
  /** bytes; 0 for a folder */
  size: number;
  /** epoch milliseconds, 0 when the API sent no date */
  modifiedAt: number;
  etag: string;
}

/** The folder bound from a drive, kept so the next session can list it again. */
export interface CloudFolderRef {
  driveId: string;
  driveName: string;
  /** the folder's item id; the drive root is `''` */
  itemId: string;
  name: string;
  /** the folder's path from the drive root, for the breadcrumb */
  path: string;
}

export type CloudErrorKind = 'unauthorised' | 'conflict' | 'throttled' | 'offline' | 'unsupported';

/** Everything that can go wrong with a drive, reduced to the five answers a caller can act on. */
export class CloudError extends Error {
  readonly kind: CloudErrorKind;
  /** set for `throttled`: what the provider asked us to wait */
  readonly retryAfterMs: number | null;

  constructor(kind: CloudErrorKind, message: string, retryAfterMs: number | null = null) {
    super(message);
    this.name = 'CloudError';
    this.kind = kind;
    this.retryAfterMs = retryAfterMs;
  }
}

export function isCloudError(reason: unknown): reason is CloudError {
  return reason instanceof CloudError;
}

/** A `CloudError`, or the same failure as one, so a caller can always ask `kind`. */
export function asCloudError(reason: unknown): CloudError {
  if (reason instanceof CloudError) return reason;
  const message = reason instanceof Error ? reason.message : String(reason);
  // a fetch that never reached the network throws a TypeError, not an HTTP status
  if (reason instanceof TypeError) return new CloudError('offline', 'The drive could not be reached.');
  return new CloudError('unsupported', message);
}
