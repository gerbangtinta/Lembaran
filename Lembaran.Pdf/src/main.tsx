import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@lembaran/ui';
import '@lembaran/ui/theme.css';
import '@lembaran/ui/shell.css';
import './presentations/pdf.css';
import { PdfApp } from './App';

// pdf.js fetches standard fonts and CMaps at runtime; both must be same-origin.
const assetBase = import.meta.env.DEV ? '/node_modules/pdfjs-dist' : '/pdf/pdfjs';

const params = new URLSearchParams(location.search);
const path = params.get('path');
const name = params.get('name') ?? 'document.pdf';

const source = path ? { kind: 'opfs' as const, path, name, mime: 'application/pdf' } : null;

const container = document.getElementById('root');
if (!container) throw new Error('#root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <PdfApp source={source} assetBase={assetBase} />
    </ThemeProvider>
  </StrictMode>,
);
