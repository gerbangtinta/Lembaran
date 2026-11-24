import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@lembaran/ui';
import '@lembaran/ui/theme.css';
import '@lembaran/ui/shell.css';
import './presentations/pptx.css';
import { SlideApp } from './App';

const params = new URLSearchParams(location.search);
const path = params.get('path');
const name = params.get('name') ?? 'presentation.pptx';

const source = path
  ? {
      kind: 'opfs' as const,
      path,
      name,
      mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    }
  : null;

const container = document.getElementById('root');
if (!container) throw new Error('#root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <SlideApp source={source} />
    </ThemeProvider>
  </StrictMode>,
);
