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

/** Measure up to `max` mints that have no fresh value, a few at a time. */
export async function refreshHolders(mints: string[], max = 25) {
  const cache = await holderCache();
  const todo = mints.filter((m) => freshShare(cache, m) === undefined).slice(0, max);
  const updates: Record<string, Entry> = {};
  for (let i = 0; i < todo.length; i += 5) {
    const batch = todo.slice(i, i + 5);
    const vals = await Promise.all(batch.map((m) => top10Share(m).catch(() => undefined)));
    batch.forEach((m, j) => { if (vals[j] !== undefined) updates[m] = { v: vals[j]!, at: Date.now() }; });
  }
  await save(updates);
  return Object.keys(updates).length;
}
