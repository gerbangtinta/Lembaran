import { cloudConfig } from './config';

/**
 * The development-only fake drive, behind a dynamic import. A build replaces `import.meta.env.DEV` with `false`,
 * so the whole branch — and the module behind it — is dropped from a production bundle.
 */
export async function fakeDrive(): Promise<typeof import('./fake') | null> {
  if (!import.meta.env?.DEV) return null;
  if (!cloudConfig().fake) return null;
  const module = await import('./fake');
  return module.fakeEnabled() ? module : null;
}
