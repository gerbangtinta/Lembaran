interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string[]>;
}

interface OpenFilePickerOptions {
  types?: FilePickerAcceptType[];
  excludeAcceptAllOption?: boolean;
  multiple?: boolean;
  id?: string;
}

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: FilePickerAcceptType[];
}

declare global {
  interface Window {
    showOpenFilePicker?: (options?: OpenFilePickerOptions) => Promise<FileSystemFileHandle[]>;
    showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
  }

  // Not in every lib.dom revision yet; Chromium ships both.
  interface FileSystemFileHandle {
    queryPermission?(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
    requestPermission?(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
  }
}

export function hasFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function';
}

export function hasOpfs(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.storage?.getDirectory === 'function';
}

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

function toTypes(extensions: string[], mimes: string[]): FilePickerAcceptType[] {
  const accept: Record<string, string[]> = {};
  for (const mime of mimes) accept[mime] = extensions.map((e) => `.${e}`);
  return extensions.length === 0 ? [] : [{ description: extensions.join(', '), accept }];
}

/** Opens the OS picker. Returns null when the user cancels. */
export async function pickFileHandle(
  extensions: string[],
  mimes: string[],
): Promise<FileSystemFileHandle | null> {
  if (!window.showOpenFilePicker) return null;
  try {
    const [handle] = await window.showOpenFilePicker({
      types: toTypes(extensions, mimes),
      excludeAcceptAllOption: false,
      multiple: false,
    });
    return handle ?? null;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null;
    throw error;
  }
}

/** The fallback path for browsers without the File System Access API. */
export function pickFileFallback(extensions: string[], mimes: string[]): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = [...extensions.map((e) => `.${e}`), ...mimes].join(',');
    input.style.display = 'none';
    const done = (file: File | null) => {
      input.remove();
      resolve(file);
    };
    input.addEventListener('change', () => done(input.files?.[0] ?? null), { once: true });
    input.addEventListener('cancel', () => done(null), { once: true });
    document.body.append(input);
    input.click();
  });
}

export async function readHandleBytes(handle: FileSystemFileHandle): Promise<Uint8Array> {
  const file = await handle.getFile();
  return new Uint8Array(await file.arrayBuffer());
}

/**
 * Asks for write permission on a file the user already opened. Saving over their own file is a second
 * grant on some browsers, so it is requested from the click that asked for it, never on load.
 */
export async function ensureWritePermission(handle: FileSystemFileHandle): Promise<boolean> {
  const descriptor = { mode: 'readwrite' as const };
  const query = handle.queryPermission;
  const request = handle.requestPermission;
  if (!query || !request) return true;
  if ((await query.call(handle, descriptor)) === 'granted') return true;
  return (await request.call(handle, descriptor)) === 'granted';
}

/** Asks for read permission again. Must be called from a user gesture. */
export async function ensureReadPermission(handle: FileSystemFileHandle): Promise<boolean> {
  const descriptor = { mode: 'read' as const };
  const query = handle.queryPermission;
  const request = handle.requestPermission;
  if (!query || !request) return true;
  if ((await query.call(handle, descriptor)) === 'granted') return true;
  return (await request.call(handle, descriptor)) === 'granted';
}

export async function saveBytesAs(
  bytes: Uint8Array,
  suggestedName: string,
  mime: string,
): Promise<boolean> {
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description: mime, accept: { [mime]: [`.${extensionOf(suggestedName) || 'bin'}`] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(new Uint8Array(bytes).buffer);
      await writable.close();
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return false;
      throw error;
    }
  }

  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = suggestedName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}
