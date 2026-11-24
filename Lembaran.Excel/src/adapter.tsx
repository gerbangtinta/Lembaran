import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@lembaran/ui';
import '@lembaran/ui/theme.css';
import '@lembaran/ui/shell.css';
import type { ReaderAdapter, ReaderContext } from '@lembaran/framework';
import './presentations/excel.css';
import { ExcelApp } from './App';

export const excelAdapter: ReaderAdapter = {
  id: 'xlsx',
  extensions: ['xlsx', 'xlsm'],
  mimeTypes: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel.sheet.macroEnabled.12',
  ],

  async mount(element: HTMLElement, context: ReaderContext) {
    const root = createRoot(element);
    root.render(
      <ThemeProvider initial={context.theme}>
        <ExcelApp source={context.source} />
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

export default excelAdapter;
