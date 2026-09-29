// x402 quote handling for UsePod. Dependency-free so it can be unit tested directly.

export type Accept = { asset: string; scheme: string; network: string; pay_to: string; amount_microunits: number };
export type Quote = { x402_version: number; quote_id: string; accepts: Accept[] };

export function parseQuote(header: string | null): Quote | null {
  if (!header) return null;
  try {
    const q = JSON.parse(Buffer.from(header, 'base64').toString('utf8')) as Quote;
    return q.quote_id && Array.isArray(q.accepts) ? q : null;
  } catch {
    return null;
  }
}
