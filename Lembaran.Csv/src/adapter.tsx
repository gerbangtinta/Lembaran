import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@lembaran/ui';
import '@lembaran/ui/theme.css';
import '@lembaran/ui/shell.css';
import type { ReaderAdapter, ReaderContext } from '@lembaran/framework';
import './presentations/csv.css';
import { CsvApp } from './App';

export const csvAdapter: ReaderAdapter = {
  id: 'csv',
  extensions: ['csv', 'tsv'],
  mimeTypes: ['text/csv', 'text/tab-separated-values'],

  async mount(element: HTMLElement, context: ReaderContext) {
    const root = createRoot(element);
    root.render(
      <ThemeProvider initial={context.theme}>
        <CsvApp source={context.source} />
      </ThemeProvider>,
    );

    return {
      async open() {
        // The app opens its source on mount.
      },
      destroy: () => root.unmount(),
    };
  },
};

export default csvAdapter;
