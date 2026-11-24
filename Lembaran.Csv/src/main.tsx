import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@lembaran/ui';
import '@lembaran/ui/theme.css';
import '@lembaran/ui/shell.css';
import './presentations/csv.css';
import { CsvApp } from './App';

const params = new URLSearchParams(location.search);
const path = params.get('path');
const name = params.get('name') ?? 'data.csv';

const source = path ? { kind: 'opfs' as const, path, name, mime: 'text/csv' } : null;

const container = document.getElementById('root');
if (!container) throw new Error('#root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <CsvApp source={source} />
    </ThemeProvider>
  </StrictMode>,
);
