import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@lembaran/ui';
import '@lembaran/ui/theme.css';
import '@lembaran/ui/shell.css';
import type { ReaderAdapter, ReaderContext } from '@lembaran/framework';
import './presentations/docs.css';
import { DocsApp } from './App';

export const docxAdapter: ReaderAdapter = {
  id: 'docx',
  extensions: ['docx'],
  mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],

  async mount(element: HTMLElement, context: ReaderContext) {
    const root = createRoot(element);
    root.render(
      <ThemeProvider initial={context.theme}>
        <DocsApp source={context.source} />
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

export default docxAdapter;
