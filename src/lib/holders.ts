import { store } from './store';
import { holderSnapshot } from './helius';
import { whaleExit } from './whales';

// One shared cache of holder measurements, so the Credit Board and every credit report score
// an agent from the same data. Each refresh also compares the big real wallets with the
// previous measurement to detect whale exits.

type Entry = {
  v: number;                       // top 10 share of supply
  at: number;
  whales?: Record<string, number>; // real wallets among the largest holders -> balance
  exit?: number;                   // share of supply the previous whales sold since the last refresh
};
const KEY = 'holders:top10';
const FRESH_MS = 6 * 3_600_000;

export async function holderCache(): Promise<Record<string, Entry>> {
  return (await store.getKv<Record<string, Entry>>(KEY)) ?? {};
}

const fresh = (cache: Record<string, Entry>, mint: string) => {
  const e = cache[mint];
  return e && Date.now() - e.at < FRESH_MS ? e : undefined;
};

export const freshShare = (cache: Record<string, Entry>, mint: string) => fresh(cache, mint)?.v;
export const freshExit = (cache: Record<string, Entry>, mint: string) => fresh(cache, mint)?.exit;

async function measure(mint: string, prev?: Entry): Promise<Entry | undefined> {
  const snap = await holderSnapshot(mint);
  if (!snap) return undefined;
  return { v: snap.top10, at: Date.now(), whales: snap.whales, exit: whaleExit(prev?.whales, snap.whales, snap.floor, snap.supply) };
}

async function save(updates: Record<string, Entry>) {
  if (!Object.keys(updates).length) return;
  const cache = await holderCache();
  await store.setKv(KEY, { ...cache, ...updates });
}

/** Holder share for one mint: cached if fresh, otherwise measured now and cached. */
export async function holderShare(mint: string): Promise<number | undefined> {
  const cache = await holderCache();
  const hit = fresh(cache, mint);
  if (hit) return hit.v;
  const e = await measure(mint, cache[mint]).catch(() => undefined);
  if (e) await save({ [mint]: e });
  return e?.v;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Measure mints that have no fresh value, one at a time. The largest-accounts RPC call is
 * heavily rate limited, so requests are spaced, retried once, and bounded by a time budget.
 */
export async function refreshHolders(mints: string[], max = 25, budgetMs = 8_000) {
  const cache = await holderCache();
  // Re-measure stale entries, and entries recorded before wallet tracking existed (no whale baseline yet).
  const todo = mints.filter((m) => !fresh(cache, m) || !cache[m]?.whales).slice(0, max);
  const updates: Record<string, Entry> = {};
  const deadline = Date.now() + budgetMs;
  for (const m of todo) {
    if (Date.now() > deadline) break;
    let e = await measure(m, cache[m]).catch(() => undefined);
    if (!e && Date.now() + 1500 < deadline) { await sleep(1200); e = await measure(m, cache[m]).catch(() => undefined); }
    if (e) updates[m] = e;
    await sleep(250);
  }
  await save(updates);
  return Object.keys(updates).length;
}
