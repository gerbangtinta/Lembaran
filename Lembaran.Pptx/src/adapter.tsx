import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@lembaran/ui';
import '@lembaran/ui/theme.css';
import '@lembaran/ui/shell.css';
import type { ReaderAdapter, ReaderContext } from '@lembaran/framework';
import './presentations/pptx.css';
import { SlideApp } from './App';

export const pptxAdapter: ReaderAdapter = {
  id: 'pptx',
  extensions: ['pptx'],
  mimeTypes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],

  async mount(element: HTMLElement, context: ReaderContext) {
    const root = createRoot(element);
    root.render(
      <ThemeProvider initial={context.theme}>
        <SlideApp source={context.source} />
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

export default pptxAdapter;
