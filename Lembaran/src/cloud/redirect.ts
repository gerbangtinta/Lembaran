/**
 * Whether a URL is the return from a sign-in redirect. Kept separate from `oauth.ts` so it can be tested without
 * loading MSAL, and so nothing has to touch `window` just to answer the question.
 */
export function signInResponseFrom(url: string): boolean {
  const [beforeHash = '', hash = ''] = url.split('#');
  const [, query = ''] = beforeHash.split('?');
  return /(^|[&?])(code|error|state)=/.test(query) || /(^|&)(code|error|state)=/.test(hash);
}

/** The error Microsoft sent back, when it refused instead of returning a code. */
export function signInErrorFrom(url: string): string | null {
  const [beforeHash = '', hash = ''] = url.split('#');
  for (const part of [hash, beforeHash.split('?')[1] ?? '']) {
    const params = new URLSearchParams(part);
    const error = params.get('error');
    if (error) {
      const description = params.get('error_description');
      return description ? `${error}: ${description}` : error;
    }
  }
  return null;
}
