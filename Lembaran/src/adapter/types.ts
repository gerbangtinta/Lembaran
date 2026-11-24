export type FormatId = 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'csv';

/** Three modes, nothing else: pastel green is the default, light and dark stay available. */
export type ThemePreference = 'pastel' | 'light' | 'dark';

/** Where a reader's bytes come from. OPFS is the normal case: the file was already copied in. */
export type DocumentSource =
  | { kind: 'opfs'; path: string; name: string; mime?: string }
  | { kind: 'bytes'; bytes: Uint8Array; name: string; mime?: string };

export interface Progress {
  phase: string;
  loaded?: number;
  total?: number;
}

export interface ReaderTarget {
  page?: number;
  slide?: number;
  sheet?: string;
  anchor?: string;
}

export interface SearchHit {
  index: number;
  text: string;
  target?: ReaderTarget;
}

export interface FilesApi {
  read(source: DocumentSource): Promise<Uint8Array>;
  saveAs(bytes: Uint8Array, suggestedName: string, mime?: string): Promise<boolean>;
}

export interface ReaderContext {
  source: DocumentSource;
  theme: ThemePreference;
  files: FilesApi;
  /** Same-origin base for engine assets (fonts, CMaps). Never a CDN. */
  assetBase: string;
  onProgress?: (p: Progress) => void;
}

export interface ReaderInstance {
  open(): Promise<void>;
  search?(query: string): Promise<SearchHit[]>;
  goTo?(target: ReaderTarget): Promise<void>;
  exportText?(): Promise<string>;
  /** Must release every engine handle. */
  destroy(): void;
}

export interface ReaderAdapter {
  id: FormatId;
  extensions: string[];
  mimeTypes: string[];
  mount(el: HTMLElement, ctx: ReaderContext): Promise<ReaderInstance>;
}
