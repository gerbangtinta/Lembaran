import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@lembaran/ui';
import '@lembaran/ui/theme.css';
import '@lembaran/ui/shell.css';
import './presentations/excel.css';
import { ExcelApp } from './App';

const params = new URLSearchParams(location.search);
const path = params.get('path');
const name = params.get('name') ?? 'workbook.xlsx';

const source = path
  ? {
      kind: 'opfs' as const,
      path,
      name,
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }
  : null;

const container = document.getElementById('root');
if (!container) throw new Error('#root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <ExcelApp source={source} />
    </ThemeProvider>
  </StrictMode>,
);
