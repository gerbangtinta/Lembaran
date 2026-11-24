import { beforeEach, describe, expect, it } from 'vitest';
import {
  cloudClientId,
  cloudConfigured,
  cloudTenant,
  configureCloud,
  rememberClientId,
  rememberTenant,
} from './config';

// `config.ts` only touches storage inside its functions, so a stand-in is enough here
const store = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  },
};

beforeEach(() => {
  store.clear();
  configureCloud({ clientId: '', tenant: 'common', redirectUri: '/', fake: false });
});

describe('the OneDrive client id', () => {
  it('comes from the build when the build has one', () => {
    configureCloud({ clientId: 'build-id' });
    rememberClientId('typed-id');
    expect(cloudClientId()).toBe('build-id');
  });

  it('falls back to the id typed into the hub, which is what makes an own registration possible', () => {
    rememberClientId('  typed-id  ');
    expect(cloudClientId()).toBe('typed-id');
    rememberClientId('');
  });

  it('ships one, so a visitor never has to register an app to connect a drive', () => {
    expect(cloudConfigured()).toBe(true);
    expect(cloudClientId()).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('counts the development fake as configured with no id at all', () => {
    configureCloud({ fake: true });
    expect(cloudConfigured()).toBe(true);
  });
});

describe('the tenant', () => {
  it('defaults to common, which reaches personal and work accounts alike', () => {
    expect(cloudTenant()).toBe('common');
  });

  it('takes the build value, and the one typed into the hub over it', () => {
    configureCloud({ tenant: 'build.onmicrosoft.com' });
    expect(cloudTenant()).toBe('build.onmicrosoft.com');
    rememberTenant('mine.onmicrosoft.com');
    expect(cloudTenant()).toBe('mine.onmicrosoft.com');
    rememberTenant('');
    expect(cloudTenant()).toBe('build.onmicrosoft.com');
  });
});
