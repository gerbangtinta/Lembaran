/**
 * The open document survives a page reload. Vite broadcasts a full reload to every client when a
 * reader's entry module changes, which would otherwise drop the reader the user was reading; the
 * same storage keeps the document open when the tab is refreshed or the machine is asleep.
 */
const KEY = 'lembaran.open';

export interface OpenDocument {
  readerId: string;
  path: string;
  name: string;
}

export function loadOpenDocument(): OpenDocument | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OpenDocument>;
    if (typeof parsed.readerId !== 'string' || typeof parsed.path !== 'string' || typeof parsed.name !== 'string') {
      return null;
    }
    return { readerId: parsed.readerId, path: parsed.path, name: parsed.name };
  } catch {
    return null;
  }
}

export function saveOpenDocument(document: OpenDocument): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(document));
  } catch {
    // private mode, quota, or a disabled store: reading still works without the memory
  }
}

export function clearOpenDocument(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}
