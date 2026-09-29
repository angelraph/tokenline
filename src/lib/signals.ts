import { config } from './config';
import { store } from './store';

// Two underwriting signals with shared caches, so the board and every report score from
// the same measurements. Values that cannot be measured stay undefined and score neutral.

const LAUNCH_KEY = 'signals:launch';
const DEV_KEY = 'signals:dev';
const DEV_FRESH_MS = 6 * 3_600_000;

type DevEntry = { creator: string | null; share: number | null; at: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function signalCaches() {
  const [launch, dev] = await Promise.all([
    store.getKv<Record<string, number>>(LAUNCH_KEY),
    store.getKv<Record<string, DevEntry>>(DEV_KEY),
  ]);
  return { launch: launch ?? {}, dev: dev ?? {} };
}

export function signalsFor(c: Awaited<ReturnType<typeof signalCaches>>, mint: string) {
  const d = c.dev[mint];
  return {
    launchedAt: c.launch[mint],
    devSoldShare: d && d.share !== null && Date.now() - d.at < DEV_FRESH_MS ? d.share : undefined,
  };
}

// Token age: earliest trading pair per mint from DexScreener, up to 30 mints per request.

export async function refreshLaunchDates(mints: string[], budgetMs = 8_000) {
  const cache = (await store.getKv<Record<string, number>>(LAUNCH_KEY)) ?? {};
  const todo = mints.filter((m) => cache[m] === undefined);
  const deadline = Date.now() + budgetMs;
  let found = 0;
  for (let i = 0; i < todo.length && Date.now() < deadline; i += 30) {
    const batch = todo.slice(i, i + 30);
    try {
      const res = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${batch.join(',')}`, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) break;
      const pairs = (await res.json()) as { baseToken?: { address?: string }; pairCreatedAt?: number }[];
      for (const p of pairs) {
        const mint = p.baseToken?.address;
        if (!mint || !p.pairCreatedAt || !batch.includes(mint)) continue;
        if (cache[mint] === undefined || p.pairCreatedAt < cache[mint]) { if (cache[mint] === undefined) found++; cache[mint] = p.pairCreatedAt; }
      }
    } catch { break; }
    await sleep(300);
  }
  if (found) await store.setKv(LAUNCH_KEY, cache);
  return found;
}

// Creator behaviour: how much of the supply the creator wallet sold in its recent swaps.

/** Creator wallet from RugCheck's full token report (the summary endpoint does not include it). */
async function creatorOf(mint: string): Promise<string | null> {
  const res = await fetch(`https://api.rugcheck.xyz/v1/tokens/${mint}/report`, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return null;
  const j = (await res.json()) as { creator?: string };
  return j.creator ?? null;
}

async function supplyOf(mint: string): Promise<number | null> {
  const url = config.heliusKey ? `https://mainnet.helius-rpc.com/?api-key=${config.heliusKey}` : 'https://api.mainnet-beta.solana.com';
  const res = await fetch(url, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTokenSupply', params: [mint] }),
    signal: AbortSignal.timeout(10_000),
  });
  const j = await res.json();
  return j.result?.value?.uiAmount ?? null;
}

/** Share of supply the creator sold across its last 100 swaps (null when it cannot be measured). */
async function measureDevSells(mint: string): Promise<DevEntry> {
  const at = Date.now();
  if (!config.heliusKey) return { creator: null, share: null, at };
  const creator = await creatorOf(mint).catch(() => null);
  if (!creator) return { creator: null, share: null, at };
  const [supply, txRes] = await Promise.all([
    supplyOf(mint).catch(() => null),
    fetch(`https://api.helius.xyz/v0/addresses/${creator}/transactions?api-key=${config.heliusKey}&type=SWAP&limit=100`, { signal: AbortSignal.timeout(15_000) }),
  ]);
  if (!supply || !txRes.ok) return { creator, share: null, at };
  const txs = (await txRes.json()) as { tokenTransfers?: { fromUserAccount: string; mint: string; tokenAmount: number }[] }[];
  const sold = txs.reduce((sum, tx) => sum + (tx.tokenTransfers ?? [])
    .filter((t) => t.mint === mint && t.fromUserAccount === creator)
    .reduce((s, t) => s + (t.tokenAmount || 0), 0), 0);
  return { creator, share: Math.min(1, sold / supply), at };
}

export async function refreshDevSells(mints: string[], max = 25, budgetMs = 8_000) {
  const cache = (await store.getKv<Record<string, DevEntry>>(DEV_KEY)) ?? {};
  const todo = mints.filter((m) => !cache[m] || Date.now() - cache[m].at >= DEV_FRESH_MS).slice(0, max);
  const deadline = Date.now() + budgetMs;
  let measured = 0;
  for (const m of todo) {
    if (Date.now() > deadline) break;
    try {
      cache[m] = await measureDevSells(m);
      if (cache[m].share !== null) measured++;
    } catch { /* leave for the next run */ }
    await sleep(400);
  }
  await store.setKv(DEV_KEY, cache);
  return measured;
}
