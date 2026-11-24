import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@lembaran/ui';
import type { ReaderAdapter, ReaderContext } from '@lembaran/framework';
import '@lembaran/ui/theme.css';
import '@lembaran/ui/shell.css';
import './presentations/pdf.css';
import { PdfApp } from './App';
import type { PdfReaderApi } from './state/api';

/**
 * The seam a host uses. It renders the same app the standalone page renders and
 * forwards calls through the app's api, so nothing is duplicated.
 */
export const pdfAdapter: ReaderAdapter = {
  id: 'pdf',
  extensions: ['pdf'],
  mimeTypes: ['application/pdf'],

  async mount(element: HTMLElement, context: ReaderContext) {
    const api: { current: PdfReaderApi | null } = { current: null };
    const root = createRoot(element);
    root.render(
      <ThemeProvider initial={context.theme}>
        <PdfApp source={context.source} assetBase={context.assetBase} apiRef={api} />
      </ThemeProvider>,
    );

    return {
      async open() {
        // The app opens its source on mount.
      },
      search: async (query) => api.current?.search(query) ?? [],
      goTo: async (target) => {
        if (typeof target.page === 'number') api.current?.goToPage(target.page);
      },
      exportText: async () => api.current?.exportText() ?? '',
      destroy: () => root.unmount(),
    };
  },
};

export default pdfAdapter;
