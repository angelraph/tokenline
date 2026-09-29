import { store } from './store';
import { top10Share } from './helius';

// One shared cache of holder concentration, so the Credit Board and every credit
// report score an agent from the same measurement.

type Entry = { v: number; at: number };
const KEY = 'holders:top10';
const FRESH_MS = 6 * 3_600_000;

export async function holderCache(): Promise<Record<string, Entry>> {
  return (await store.getKv<Record<string, Entry>>(KEY)) ?? {};
}

export const freshShare = (cache: Record<string, Entry>, mint: string) => {
  const e = cache[mint];
  return e && Date.now() - e.at < FRESH_MS ? e.v : undefined;
};

async function save(updates: Record<string, Entry>) {
  if (!Object.keys(updates).length) return;
  const cache = await holderCache();
  await store.setKv(KEY, { ...cache, ...updates });
}

/** Holder share for one mint: cached if fresh, otherwise measured now and cached. */
export async function holderShare(mint: string): Promise<number | undefined> {
  const cache = await holderCache();
  const hit = freshShare(cache, mint);
  if (hit !== undefined) return hit;
  const v = await top10Share(mint);
  if (v !== undefined) await save({ [mint]: { v, at: Date.now() } });
  return v;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Measure mints that have no fresh value, one at a time. The largest-accounts RPC call is
 * heavily rate limited, so requests are spaced, retried once, and bounded by a time budget.
 */
export async function refreshHolders(mints: string[], max = 25, budgetMs = 8_000) {
  const cache = await holderCache();
  const todo = mints.filter((m) => freshShare(cache, m) === undefined).slice(0, max);
  const updates: Record<string, Entry> = {};
  const deadline = Date.now() + budgetMs;
  for (const m of todo) {
    if (Date.now() > deadline) break;
    let v = await top10Share(m).catch(() => undefined);
    if (v === undefined && Date.now() + 1500 < deadline) { await sleep(1200); v = await top10Share(m).catch(() => undefined); }
    if (v !== undefined) updates[m] = { v, at: Date.now() };
    await sleep(250);
  }
  await save(updates);
  return Object.keys(updates).length;
}
