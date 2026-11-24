/**
 * The OneDrive settings a build carries. The apps prime this from their own `import.meta.env` (which Vite
 * rewrites at build time) instead of the framework reading it, because a workspace package is pre-bundled in
 * development and `import.meta.env` does not survive that — the value would silently read as empty.
 */
export interface CloudConfig {
  /** the Entra app registration's client id; empty means OneDrive is not offered */
  clientId: string;
  /** `common`, or one tenant id */
  tenant: string;
  /** where the sign-in popup returns to; must be registered on the app */
  redirectUri: string;
  /** the development fake drive (`?drive=fake`): never true in a built app */
  fake: boolean;
}

let current: CloudConfig = { clientId: '', tenant: 'common', redirectUri: '/', fake: false };

/**
 * The registration this build ships with, so a visitor can sign in without creating an Entra app first. A client id
 * is public by design (see `ARCHITECTURE.md`); what protects the app is the exact-match redirect-URI list on the
 * registration, each user's own consent, and PKCE. A build's `VITE_MS_CLIENT_ID`, or one typed into the hub, wins
 * over this.
 */
const SHIPPED_CLIENT_ID = 'd7eca84d-3ce5-4cbc-b018-cc567a88adc8';

/** The id can also be typed in from the app, so a build without one is not a dead end. A client id is public. */
const OVERRIDE_KEY = 'lembaran.onedrive.clientId';

/** A work-only app registration cannot be reached through `common`: the tenant is asked for beside the id. */
const TENANT_KEY = 'lembaran.onedrive.tenant';

export function configureCloud(config: Partial<CloudConfig>): void {
  current = { ...current, ...config };
}

export function cloudConfig(): CloudConfig {
  return current;
}

/** A client id entered in the app, kept on this device only. */
export function storedClientId(): string {
  try {
    return (window.localStorage.getItem(OVERRIDE_KEY) ?? '').trim();
  } catch {
    return '';
  }
}

export function rememberClientId(clientId: string): void {
  try {
    const trimmed = clientId.trim();
    if (trimmed.length > 0) window.localStorage.setItem(OVERRIDE_KEY, trimmed);
    else window.localStorage.removeItem(OVERRIDE_KEY);
  } catch {
    // a browser that refuses storage has no override: the id the build carries still applies
  }
}

/** The id in force: the build's own, else the one typed here, else the registration this build ships with. */
export function cloudClientId(): string {
  const configured = current.clientId.trim();
  if (configured.length > 0) return configured;
  const typed = storedClientId();
  return typed.length > 0 ? typed : SHIPPED_CLIENT_ID;
}

/** A tenant entered in the app, kept on this device only. */
export function storedTenant(): string {
  try {
    return (window.localStorage.getItem(TENANT_KEY) ?? '').trim();
  } catch {
    return '';
  }
}

export function rememberTenant(tenant: string): void {
  try {
    const trimmed = tenant.trim();
    if (trimmed.length > 0) window.localStorage.setItem(TENANT_KEY, trimmed);
    else window.localStorage.removeItem(TENANT_KEY);
  } catch {
    // as above: a build-time tenant still applies
  }
}

/**
 * The authority's tenant. `common` reaches personal accounts and any work account; a work-only registration is
 * only reachable through its own tenant id or domain, and the consumer endpoint answers
 * `unauthorized_client ... not enabled for consumers` when `common` meets an app that excludes personal accounts.
 */
export function cloudTenant(): string {
  const pinned = storedTenant();
  if (pinned.length > 0) return pinned;
  const configured = current.tenant.trim();
  return configured.length > 0 ? configured : 'common';
}

/** Whether OneDrive can be offered at all: a client id for a real drive, or the development fake. */
export function cloudConfigured(): boolean {
  return current.fake || cloudClientId().length > 0;
}
