import { config } from './config';

const rpcUrl = () =>
  config.heliusKey ? `https://mainnet.helius-rpc.com/?api-key=${config.heliusKey}` : 'https://api.mainnet-beta.solana.com';

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(rpcUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(15_000),
  });
  const j = await res.json();
  if (j.error) throw new Error(`${method}: ${j.error.message}`);
  return j.result as T;
}

const top10Cache = new Map<string, { v: number; at: number }>();

/** Share of supply held by the 10 largest token accounts (0..1). */
export async function top10Share(mint: string): Promise<number | undefined> {
  const hit = top10Cache.get(mint);
  if (hit && Date.now() - hit.at < 30 * 60_000) return hit.v;
  try {
    const [largest, supply] = await Promise.all([
      rpc<{ value: { uiAmount: number }[] }>('getTokenLargestAccounts', [mint]),
      rpc<{ value: { uiAmount: number } }>('getTokenSupply', [mint]),
    ]);
    const total = supply.value.uiAmount;
    if (!total) return undefined;
    const top = largest.value.slice(0, 10).reduce((s, a) => s + (a.uiAmount ?? 0), 0);
    const v = Math.min(1, top / total);
    top10Cache.set(mint, { v, at: Date.now() });
    return v;
  } catch {
    return undefined;
  }
}

/** UI balance of `mint` held by `owner`. */
export async function tokenBalance(owner: string, mint: string): Promise<number> {
  if (!owner || !mint) return 0;
  try {
    const r = await rpc<{ value: { account: { data: { parsed: { info: { tokenAmount: { uiAmount: number } } } } } }[] }>(
      'getTokenAccountsByOwner', [owner, { mint }, { encoding: 'jsonParsed' }]);
    return r.value.reduce((s, a) => s + (a.account.data.parsed.info.tokenAmount.uiAmount ?? 0), 0);
  } catch {
    return 0;
  }
}

export type EnhancedTx = {
  signature: string;
  timestamp: number;
  nativeTransfers?: { fromUserAccount: string; toUserAccount: string; amount: number }[];
  tokenTransfers?: { fromUserAccount: string; toUserAccount: string; tokenAmount: number; mint: string }[];
};

/** Helius Enhanced Transactions for an address, newest first. Requires HELIUS_API_KEY. */
export async function addressTransactions(address: string, until?: string): Promise<EnhancedTx[]> {
  if (!config.heliusKey) throw new Error('HELIUS_API_KEY is required for on-chain sync');
  const u = new URL(`https://api.helius.xyz/v0/addresses/${address}/transactions`);
  u.searchParams.set('api-key', config.heliusKey);
  u.searchParams.set('limit', '100');
  if (until) u.searchParams.set('until', until);
  const res = await fetch(u, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`helius ${res.status}: ${await res.text()}`);
  return (await res.json()) as EnhancedTx[];
}
