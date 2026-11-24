import type { SearchHit } from '@lembaran/framework';

/** What the adapter can do on behalf of a host (the hub, a script, a link). */
export interface PdfReaderApi {
  goToPage(page: number): void;
  search(query: string): Promise<SearchHit[]>;
  exportText(): Promise<string>;
}
