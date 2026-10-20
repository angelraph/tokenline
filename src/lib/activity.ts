import { nextActivity, type Activity } from './activitycore';
import { store } from './store';

// Live 24h trading volume per token from ClawPump's public token API, kept once the hackathon fee feed closed.

const KEY = 'activity:v1';
const FRESH_MS = 2 * 3_600_000;

export type ActivityCache = Record<string, Activity>;

export const activityCache = async () => (await store.getKv<ActivityCache>(KEY)) ?? {};

async function volume24h(mint: string): Promise<number | undefined> {
  const res = await fetch(`https://clawpump.tech/api/tokens?limit=1&q=${encodeURIComponent(mint)}`, { cache: 'no-store', signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return undefined;
  const j = await res.json().catch(() => null);
  const t = (j?.tokens as { mintAddress: string; volume24h: number }[] | undefined)?.find((x) => x.mintAddress === mint);
  return t ? Math.max(0, Number(t.volume24h) || 0) : undefined;
}

/** Re-check tokens whose activity is missing or older than two hours, a few at a time, within a time budget. */
export async function refreshActivity(mints: string[], budgetMs = 8_000, concurrency = 6) {
  const started = Date.now();
  const cache = await activityCache();
  const due = mints.filter((m) => !cache[m] || started - cache[m].checkedAt > FRESH_MS)
    .sort((a, b) => (cache[a]?.checkedAt ?? 0) - (cache[b]?.checkedAt ?? 0));
  let done = 0;
  for (let i = 0; i < due.length && Date.now() - started < budgetMs; i += concurrency) {
    const batch = due.slice(i, i + concurrency);
    const vols = await Promise.all(batch.map((m) => volume24h(m).catch(() => undefined)));
    const now = Date.now();
    batch.forEach((m, k) => {
      if (vols[k] === undefined) return;
      cache[m] = nextActivity(cache[m], vols[k]!, now);
      done++;
    });
  }
  if (done) await store.setKv(KEY, cache);
  return done;
}

/** Share of the given mints with a live activity reading. */
export const activityCoverage = (cache: ActivityCache, mints: string[]) =>
  mints.filter((m) => cache[m]).length / Math.max(1, mints.length);
