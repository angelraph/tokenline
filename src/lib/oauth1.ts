import { createHmac, randomBytes } from 'node:crypto';

// OAuth 1.0a request signing (HMAC-SHA1) for posting as @tokenlinehq through the X API.
// Dependency-free so the published X test vector can check it directly.

export type OAuthKeys = { consumerKey: string; consumerSecret: string; token: string; tokenSecret: string };

/** RFC 3986 percent-encoding, as OAuth 1.0a requires. */
export const pct = (s: string) =>
  encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/**
 * Signature over method, base URL and every query/form parameter plus the oauth_* fields.
 * JSON request bodies (X API v2) are not part of the signature.
 */
export function signature(method: string, url: string, params: Record<string, string>, consumerSecret: string, tokenSecret: string) {
  const norm = Object.entries(params)
    .map(([k, v]) => [pct(k), pct(v)] as const)
    .sort(([a, av], [b, bv]) => (a === b ? (av < bv ? -1 : 1) : a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  const base = [method.toUpperCase(), pct(url), pct(norm)].join('&');
  return createHmac('sha1', `${pct(consumerSecret)}&${pct(tokenSecret)}`).update(base).digest('base64');
}

/** Authorization header for one request. `nonce` and `timestamp` are injectable for testing. */
export function authHeader(method: string, url: string, keys: OAuthKeys, extra: Record<string, string> = {},
  nonce = randomBytes(16).toString('hex'), timestamp = Math.floor(Date.now() / 1000).toString()) {
  const oauth: Record<string, string> = {
    oauth_consumer_key: keys.consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: keys.token,
    oauth_version: '1.0',
  };
  const sig = signature(method, url, { ...extra, ...oauth }, keys.consumerSecret, keys.tokenSecret);
  const fields = { ...oauth, oauth_signature: sig };
  return 'OAuth ' + Object.entries(fields).map(([k, v]) => `${pct(k)}="${pct(v)}"`).join(', ');
}
