import type { AccountInfo, IPublicClientApplication } from '@azure/msal-browser';
import { cloudClientId, cloudConfig, cloudConfigured, cloudTenant } from './config';
import { fakeDrive } from './fakeGate';
import { clearCloudFolder, clearCloudSession, saveCloudSession } from './store';
import { CloudError, type CloudAccount } from './types';
import { signInErrorFrom, signInResponseFrom } from './redirect';

/** Delegated permissions: read and write the files this account can already touch, and read its name. */
const SCOPES = ['Files.ReadWrite', 'User.Read'];

/**
 * Set before the page leaves for Microsoft, read once it comes back. A top-level redirect reloads the hub, so the
 * only thing that remembers "the person was in the middle of connecting a drive" is this flag.
 */
const RESUME_KEY = 'lembaran.onedrive.resuming';

let client: IPublicClientApplication | null = null;
let clientKey = '';
let booting: Promise<IPublicClientApplication> | null = null;

export { cloudClientId, cloudConfigured };

/** Whether the current URL is a sign-in response, checked without loading the library. */
export function cloudSignInResponse(): boolean {
  return signInResponseFrom(window.location.href);
}

/** What Microsoft complained about on the way back, if anything. */
export function cloudSignInError(): string | null {
  return signInErrorFrom(window.location.href);
}

/** True once, if this page is the return from the sign-in redirect. */
export function consumeSignInReturn(): boolean {
  try {
    const resuming = window.sessionStorage.getItem(RESUME_KEY) === '1';
    if (resuming) window.sessionStorage.removeItem(RESUME_KEY);
    return resuming;
  } catch {
    return false;
  }
}

export function clearSignInReturn(): void {
  try {
    window.sessionStorage.removeItem(RESUME_KEY);
  } catch {
    // nothing to clear
  }
}

/**
 * Strip a spent or failed sign-in response from the address bar. Called once the attempt has been made, whether it
 * worked or not: leaving `#code=…` behind means a reload replays a response that can never succeed twice.
 */
export function settleSignInUrl(): void {
  if (!signInResponseFrom(window.location.href)) return;
  window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);
}

function redirectUri(): string {
  const configured = cloudConfig().redirectUri;
  if (configured.length > 0 && configured !== '/') return configured;
  return new URL(configured || '/', window.location.origin).href;
}

function toAccount(account: AccountInfo): CloudAccount {
  return {
    id: account.homeAccountId,
    name: account.name ?? account.username,
    username: account.username,
    tenantId: account.tenantId ?? '',
  };
}

/**
 * The one place MSAL is loaded, and it is loaded **only when a drive is chosen**: the hub's own bundle stays
 * the size it was for everyone who never connects one.
 */
async function instance(): Promise<IPublicClientApplication> {
  const id = cloudClientId();
  if (id.length === 0) {
    throw new CloudError('unsupported', 'OneDrive is not set up in this build: VITE_MS_CLIENT_ID is empty.');
  }
  const authority = `https://login.microsoftonline.com/${cloudTenant()}`;
  const key = `${id}|${authority}`;
  if (client && clientKey === key) {
    if (booting) await booting;
    return client;
  }
  clientKey = key;
  booting = (async () => {
    const msal = await import('@azure/msal-browser');
    const app = new msal.PublicClientApplication({
      auth: {
        clientId: id,
        authority,
        redirectUri: redirectUri(),
      },
      cache: { cacheLocation: 'localStorage' },
    });
    await app.initialize();
    // a sign-in that came back as a redirect: take the account, and let the URL be cleaned up
    await app.handleRedirectPromise().catch(() => null);
    const known = app.getActiveAccount() ?? app.getAllAccounts()[0];
    if (known) app.setActiveAccount(known);
    // keep the row the hub shows in step with what the cache actually holds
    if (known) void saveCloudSession(toAccount(known));
    else void clearCloudSession();
    client = app;
    return app;
  })();
  try {
    return await booting;
  } catch (reason) {
    booting = null;
    throw new CloudError(
      'unsupported',
      `The sign-in library could not be loaded: ${reason instanceof Error ? reason.message : String(reason)}`,
    );
  }
}

/** The signed-in account, or null. Never prompts. */
export async function cloudAccount(): Promise<CloudAccount | null> {
  const fake = await fakeDrive();
  if (fake) return fake.fakeAccount;
  if (cloudClientId().length === 0) return null;
  try {
    const app = await instance();
    const account = app.getActiveAccount() ?? app.getAllAccounts()[0] ?? null;
    return account ? toAccount(account) : null;
  } catch {
    return null;
  }
}

/**
 * Sign in by leaving for Microsoft and coming straight back — the flow Microsoft documents for single-page apps.
 * The popup variant needs the opener and the response page to agree on a hash held in that window's
 * `sessionStorage`; a second copy of this app cannot see it, so the popup stays open while the hub waits. A
 * top-level navigation has no such seam: the response lands in this window, `handleRedirectPromise` takes it on
 * boot, and `RESUME_KEY` tells the folder section where to carry on. The page is already leaving, so this promise
 * deliberately does not resolve; the caller's watchdog is what recovers if nothing happens.
 */
export async function cloudSignIn(options: { chooseAccount?: boolean } = {}): Promise<CloudAccount> {
  const fake = await fakeDrive();
  if (fake) {
    await saveCloudSession(fake.fakeAccount);
    return fake.fakeAccount;
  }
  const app = await instance();
  try {
    window.sessionStorage.setItem(RESUME_KEY, '1');
  } catch {
    // a browser that refuses storage still signs in; it just cannot resume the drive panel afterwards
  }
  try {
    // no `prompt` keeps an existing session silent; `select_account` is only asked for when another account is wanted
    await app.loginRedirect({
      scopes: SCOPES,
      ...(options.chooseAccount ? { prompt: 'select_account' as const } : {}),
    });
  } catch (reason) {
    clearSignInReturn();
    throw new CloudError('unauthorised', authMessage(reason));
  }
  await new Promise<never>(() => undefined);
  throw new CloudError('unauthorised', 'The browser did not leave for the sign-in page.');
}

/** Disconnect: the record goes, the bound drive folder goes, and the token cache is emptied. */
export async function cloudSignOut(): Promise<void> {
  const app = client;
  await clearCloudSession();
  await clearCloudFolder();
  if (!app) return;
  const account = app.getActiveAccount() ?? app.getAllAccounts()[0] ?? undefined;
  try {
    await app.logoutPopup({ account });
  } catch {
    await app.clearCache().catch(() => undefined);
  }
  app.setActiveAccount(null);
}

/** A bearer token for Graph, from the cache when it is still good. Never opens a popup. */
export async function cloudToken(): Promise<string> {
  const fake = await fakeDrive();
  if (fake) return 'fake-token';
  const app = await instance();
  const account = app.getActiveAccount() ?? app.getAllAccounts()[0] ?? null;
  if (!account) throw new CloudError('unauthorised', 'Sign in to OneDrive first.');
  try {
    const result = await app.acquireTokenSilent({ scopes: SCOPES, account });
    if (result.account) app.setActiveAccount(result.account);
    return result.accessToken;
  } catch (reason) {
    // the CSP forbids the SSO iframe, and a refresh token can be dropped: the honest answer is "sign in again"
    throw new CloudError('unauthorised', authMessage(reason));
  }
}

function authMessage(reason: unknown): string {
  const text = reason instanceof Error ? reason.message : String(reason);
  if (/popup|window/i.test(text)) return 'The sign-in window was blocked or closed. Try again, allowing pop-ups.';
  if (/\btimed_out\b|network|fetch/i.test(text)) {
    return 'Microsoft did not answer the sign-in in time. Check the connection, then sign in again.';
  }
  if (/access_denied|cancel/i.test(text)) return 'The sign-in was cancelled at Microsoft. Nothing was changed.';
  if (/not enabled for consumers|unauthorized_client/i.test(text)) {
    return 'That app registration does not accept personal Microsoft accounts. Set its Manifest signInAudience to AzureADandPersonalMicrosoftAccount (or enter your own tenant beside the client id) and try again.';
  }
  if (/AADSTS9002326|single-page application/i.test(text)) {
    return 'That app registration has no Single-page application platform for this address. Add the redirect URI under Authentication → Single-page application, then try again.';
  }
  if (/interaction|consent|login_required|AADSTS/i.test(text)) return 'OneDrive needs you to sign in again.';
  return text;
}
