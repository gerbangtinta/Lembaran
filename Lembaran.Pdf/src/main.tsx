import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { configureCloud } from '@lembaran/framework';
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

// a document opened from OneDrive keeps its drive reference in the recent record, so this frame has to know the
// same client id the hub does; the fake drive arrives as `drive=fake` in the frame's own URL
configureCloud({
  clientId: (import.meta.env.VITE_MS_CLIENT_ID ?? '').trim(),
  tenant: (import.meta.env.VITE_MS_TENANT ?? 'common').trim() || 'common',
  redirectUri: new URL(import.meta.env.BASE_URL ?? '/', window.location.origin).href,
  fake: Boolean(import.meta.env.DEV) && params.get('drive') === 'fake',
});

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
