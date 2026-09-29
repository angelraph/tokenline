import { config } from './config';
import { getClawrena } from './clawrena';

const cache = new Map<string, { usd: number; at: number }>();
const TTL = 60_000;

/** USD price for a Solana mint via DexScreener (highest-liquidity pair). */
export async function tokenUsd(mint: string): Promise<number> {
  if (!mint) return 0;
  if (mint === config.mints.usdc) return 1;
  const hit = cache.get(mint);
  if (hit && Date.now() - hit.at < TTL) return hit.usd;
  try {
    const res = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${mint}`, {
      signal: AbortSignal.timeout(10_000),
    });
    const pairs = (await res.json()) as { priceUsd?: string; liquidity?: { usd?: number } }[];
    const best = pairs.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
    const usd = Number(best?.priceUsd) || 0;
    cache.set(mint, { usd, at: Date.now() });
    return usd;
  } catch {
    return hit?.usd ?? 0;
  }
}

export async function solUsd(): Promise<number> {
  try {
    const p = (await getClawrena()).solPriceUsd;
    if (p) return p;
  } catch { /* fall through */ }
  return tokenUsd('So11111111111111111111111111111111111111112');
}

export async function assetUsd(asset: string): Promise<number> {
  if (asset === 'SOL') return solUsd();
  return tokenUsd(asset);
}
