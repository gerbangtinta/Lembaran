export type {
  DocumentSource,
  FilesApi,
  FormatId,
  Progress,
  ReaderAdapter,
  ReaderContext,
  ReaderInstance,
  ReaderTarget,
  SearchHit,
  ThemePreference,
} from './adapter/types';

export { sha256Hex } from './files/hash';
export {
  ensureReadPermission,
  extensionOf,
  hasFileSystemAccess,
  hasOpfs,
  pickFileFallback,
  pickFileHandle,
  readHandleBytes,
  saveBytesAs,
} from './files/pick';
export { openLocalFile, type LocalFile } from './files/open';
export {
  hasSource,
  ingest,
  ingestFile,
  opfsAvailable,
  putSource,
  readSource,
  removeSource,
  sourcePath,
  type Ingested,
} from './opfs/store';
export {
  clearRecent,
  db,
  forget,
  listRecent,
  remember,
  type BoundFolder,
  type RecentEntry,
} from './handles/store';
export {
  bindFolder,
  eligiblePaths,
  ensureFolderPermission,
  FOLDER_DEPTH_LIMIT,
  FOLDER_FILE_LIMIT,
  folderPermission,
  folderCounts,
  folderView,
  hasDirectoryPicker,
  listFolder,
  loadBoundFolder,
  pathSegments,
  pickFolderFallback,
  searchFolder,
  readFolderFile,
  shouldListPath,
  sortFolderFiles,
  unbindFolder,
  type FolderFile,
  type FolderSearch,
  type FolderView,
} from './folders';export { notices, ownLicense, type NoticeEntry } from './licenses/notices';
