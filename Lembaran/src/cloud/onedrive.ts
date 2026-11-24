import { cloudToken } from './oauth';
import { fakeDrive } from './fakeGate';
import {
  cloudErrorFor,
  collectPage,
  primaryDrives,
  SIMPLE_UPLOAD_LIMIT,
  toDrive,
  toEntry,
  UPLOAD_CHUNK,
  uploadChunks,
  type DriveShape,
  type GraphItem,
  type GraphPage,
} from './graph';
import { asCloudError, type CloudDrive, type CloudEntry } from './types';

export { cloudErrorFor, collectPage, SIMPLE_UPLOAD_LIMIT, toEntry, UPLOAD_CHUNK, uploadChunks };
export type { GraphItem, GraphPage };

const GRAPH = 'https://graph.microsoft.com/v1.0';

async function request(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  let token: string;
  try {
    token = await cloudToken();
  } catch (reason) {
    throw asCloudError(reason);
  }
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
      redirect: 'follow',
    });
  } catch (reason) {
    throw asCloudError(reason);
  }
  if (response.ok) return response;

  const failure = cloudErrorFor(response.status, response.headers, await safeText(response));
  // one retry, exactly as the provider asked: a throttle is not a reason to lose a save
  if (failure.kind === 'throttled' && retry) {
    await new Promise((resolve) => setTimeout(resolve, failure.retryAfterMs ?? 1000));
    return request(path, init, false);
  }
  throw failure;
}

async function safeText(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 200);
  } catch {
    return '';
  }
}

/** The bytes as a request body: the DOM types want a `Blob`, not a typed-array view. */
function bodyOf(bytes: Uint8Array): Blob {
  return new Blob([new Uint8Array(bytes)]);
}

async function json<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await request(path, init);
  return (await response.json()) as T;
}

/** Every drive the account can see: personal, business, and any SharePoint document library. */
export async function listDrives(): Promise<CloudDrive[]> {
  const fake = await fakeDrive();
  if (fake) return fake.fakeDrives();
  // `/me/drive` is the one drive a person actually uses; `/me/drives` adds the document libraries a work account can
  // reach — and, on a personal account, a pile of auxiliary drives that must not be shown
  const [defaultDrive, page] = await Promise.all([
    json<DriveShape>(`${GRAPH}/me/drive?$select=id,name,driveType`).catch(() => null),
    json<{ value?: DriveShape[] }>(`${GRAPH}/me/drives?$select=id,name,driveType&$top=100`).catch(() => ({
      value: [] as DriveShape[],
    })),
  ]);
  return primaryDrives(defaultDrive, page.value ?? []).map(toDrive);
}

const SELECT = '$select=id,name,size,eTag,lastModifiedDateTime,file,folder&$top=200';

/** One folder's children, page by page, up to `limit`. `itemId` of null means the drive root. */
export async function listChildren(
  driveId: string,
  itemId: string | null,
  limit = 300,
): Promise<CloudEntry[]> {
  const fake = await fakeDrive();
  if (fake) return fake.fakeChildren(driveId, itemId).slice(0, limit);

  const base =
    itemId === null || itemId.length === 0
      ? `${GRAPH}/drives/${driveId}/root/children?${SELECT}`
      : `${GRAPH}/drives/${driveId}/items/${itemId}/children?${SELECT}`;

  let collected: CloudEntry[] = [];
  let next: string | null = base;
  while (next && collected.length < limit) {
    const page: GraphPage = await json<GraphPage>(next);
    collected = collectPage(collected, page.value ?? [], limit);
    next = page['@odata.nextLink'] ?? null;
  }
  return collected;
}

/** The item's current version, so a write can say which version it is replacing. */
export async function statItem(driveId: string, itemId: string): Promise<CloudEntry> {
  const fake = await fakeDrive();
  if (fake) return fake.fakeStat(driveId, itemId);
  const item = await json<GraphItem>(
    `${GRAPH}/drives/${driveId}/items/${itemId}?$select=id,name,size,eTag,lastModifiedDateTime,file,folder`,
  );
  return toEntry(item);
}

/** The bytes, and the version they were read at. */
export async function readFile(driveId: string, itemId: string): Promise<{ bytes: Uint8Array; etag: string }> {
  const fake = await fakeDrive();
  if (fake) return fake.fakeRead(driveId, itemId);
  const before = await statItem(driveId, itemId);
  const response = await request(`${GRAPH}/drives/${driveId}/items/${itemId}/content`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { bytes, etag: before.etag };
}

/**
 * Put bytes back where they came from. `etag` is sent as `If-Match`, so a copy that changed elsewhere is a
 * conflict rather than a silent overwrite. Above `SIMPLE_UPLOAD_LIMIT` the bytes go up in session chunks.
 */
export async function writeFile(
  driveId: string,
  itemId: string,
  bytes: Uint8Array,
  etag: string,
): Promise<{ etag: string; size: number }> {
  const fake = await fakeDrive();
  if (fake) return fake.fakeWrite(itemId, bytes, etag);

  const headers: Record<string, string> = { 'Content-Type': 'application/octet-stream' };
  if (etag.length > 0) headers['If-Match'] = etag;

  if (bytes.byteLength <= SIMPLE_UPLOAD_LIMIT) {
    const response = await request(`${GRAPH}/drives/${driveId}/items/${itemId}/content`, {
      method: 'PUT',
      headers,
      body: bodyOf(bytes),
    });
    const item = (await response.json().catch(() => null)) as GraphItem | null;
    return { etag: item?.eTag ?? '', size: item?.size ?? bytes.byteLength };
  }

  const session = await json<{ uploadUrl: string }>(
    `${GRAPH}/drives/${driveId}/items/${itemId}/createUploadSession`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(etag.length > 0 ? { 'If-Match': etag } : {}) },
      body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': 'replace' } }),
    },
  );

  let last: GraphItem | null = null;
  for (const chunk of uploadChunks(bytes.byteLength)) {
    const response = await fetch(session.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Range': `bytes ${chunk.start}-${chunk.end}/${bytes.byteLength}`,
        'Content-Length': String(chunk.end - chunk.start + 1),
      },
      body: bodyOf(bytes.subarray(chunk.start, chunk.end + 1)),
    });
    if (!response.ok) throw cloudErrorFor(response.status, response.headers, await safeText(response));
    last = (await response.json().catch(() => null)) as GraphItem | null;
  }
  return { etag: last?.eTag ?? '', size: bytes.byteLength };
}

/** A new file inside a folder — what "save a copy" uses. */
export async function uploadFile(
  driveId: string,
  folderId: string,
  name: string,
  bytes: Uint8Array,
): Promise<{ itemId: string; etag: string }> {
  const response = await request(
    `${GRAPH}/drives/${driveId}/items/${folderId || 'root'}:/${encodeURIComponent(name)}:/content?@microsoft.graph.conflictBehavior=rename`,
    { method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: bodyOf(bytes) },
  );
  const item = (await response.json().catch(() => null)) as GraphItem | null;
  return { itemId: item?.id ?? '', etag: item?.eTag ?? '' };
}
