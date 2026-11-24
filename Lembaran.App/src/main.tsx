import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { configureCloud } from '@lembaran/framework';
import { ThemeProvider } from '@lembaran/ui';
import '@lembaran/ui/theme.css';
import './presentations/hub.css';
import { HubApp } from './App';

// OneDrive needs a client id: this build's, or one typed into the hub and kept on the device (see
// `cloud/config.ts`). In development the fake drive is asked for with `?drive=fake`. Primed here because
// `import.meta.env` is rewritten for app code and not for a workspace package.
const devFlag = Boolean(import.meta.env.DEV);
// `URLSearchParams.has` takes a key, not `key=value`: the flag is `?drive=fake`
const fakeFlag = new URLSearchParams(window.location.search).get('drive') === 'fake';

configureCloud({
  clientId: (import.meta.env.VITE_MS_CLIENT_ID ?? '').trim(),
  tenant: (import.meta.env.VITE_MS_TENANT ?? 'common').trim() || 'common',
  redirectUri: new URL(import.meta.env.BASE_URL ?? '/', window.location.origin).href,
  fake: devFlag && fakeFlag,
});

const container = document.getElementById('root');
if (!container) throw new Error('#root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <HubApp />
    </ThemeProvider>
  </StrictMode>,
);
