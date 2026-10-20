import { CLAWRENA_FEED } from './config';

export type ClawrenaProject = {
  mint: string;
  symbol: string;
  xHandle: string | null;
  projectName: string;
  grossFeesSol: number;
  platformFeesSol: number;
  collections: number;
  firstFeeAt: string | null;
  lastFeeAt: string | null;
  volumeSol: number;
  volume24hUsd: number;
};

export type ClawrenaFeed = {
  solPriceUsd: number;
  totals: { projects: number; projectsEarning: number; grossFeesSol: number; volumeUsd: number };
  projects: ClawrenaProject[];
  /** Set once the feed's fee window has closed: scores are computed as of that moment, not today. */
  asOf: number | null;
  fetchedAt: number;
};

let cache: ClawrenaFeed | null = null;
const TTL_MS = 60_000;

/** Public ClawPump Clawrena leaderboard feed, cached for a minute. */
export async function getClawrena(): Promise<ClawrenaFeed> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) return cache;
  try {
    const res = await fetch(CLAWRENA_FEED, { cache: 'no-store', signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`clawrena feed ${res.status}`);
    const j = await res.json();
    cache = {
      solPriceUsd: Number(j.solPriceUsd) || 0,
      totals: j.totals,
      projects: (j.projects ?? []).map((p: Record<string, unknown>) => ({
        mint: String(p.mint),
        symbol: String(p.symbol ?? ''),
        xHandle: (p.xHandle as string) ?? null,
        projectName: String(p.projectName ?? p.symbol ?? p.mint),
        grossFeesSol: Number(p.grossFeesSol) || 0,
        platformFeesSol: Number(p.platformFeesSol) || 0,
        collections: Number(p.collections) || 0,
        firstFeeAt: (p.firstFeeAt as string) ?? null,
        lastFeeAt: (p.lastFeeAt as string) ?? null,
        volumeSol: Number(p.volumeSol) || 0,
        volume24hUsd: Number(p.volume24hUsd) || 0,
      })),
      asOf: j.hasEnded && j.window?.end && Number.isFinite(Date.parse(j.window.end)) ? Date.parse(j.window.end) : null,
      fetchedAt: Date.now(),
    };
    return cache;
  } catch (e) {
    if (cache) return cache; // serve stale rather than fail the board
    throw e;
  }
}

export async function findProject(mint: string) {
  const feed = await getClawrena();
  return { feed, project: feed.projects.find((p) => p.mint === mint) ?? null };
}
