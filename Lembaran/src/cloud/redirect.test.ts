import { describe, expect, it } from 'vitest';
import { signInErrorFrom, signInResponseFrom } from './redirect';

describe('the return from a sign-in redirect', () => {
  it('recognises the hash MSAL comes back with', () => {
    expect(signInResponseFrom('http://localhost:5173/#code=M.C533_BAY.2.U&state=abc')).toBe(true);
    expect(signInResponseFrom('http://localhost:5173/#state=abc&error=access_denied')).toBe(true);
  });

  it('recognises a code that arrives as a query after the redirect', () => {
    expect(signInResponseFrom('http://localhost:5173/?code=0.AQ&state=abc')).toBe(true);
  });

  it('stays quiet on an ordinary page, a reader path and an unrelated hash', () => {
    expect(signInResponseFrom('http://localhost:5173/')).toBe(false);
    expect(signInResponseFrom('http://localhost:5173/pdf/#/page=3')).toBe(false);
    expect(signInResponseFrom('http://localhost:5173/#annotations')).toBe(false);
  });

  it('reports the refusal Microsoft sent back, so the hub can say it out loud', () => {
    expect(signInErrorFrom('http://localhost:5173/#error=access_denied&error_description=AADSTS50011')).toBe(
      'access_denied: AADSTS50011',
    );
    expect(signInErrorFrom('http://localhost:5173/#code=abc&state=xyz')).toBeNull();
    expect(signInErrorFrom('http://localhost:5173/')).toBeNull();
  });
});
