import { ingest } from '@/lib/sync';
import { config } from '@/lib/config';
import { ok, fail } from '@/lib/http';
import type { EnhancedTx } from '@/lib/helius';

/** Helius "enhanced" webhook on POOL_WALLET/ESCROW_WALLET: credits land within seconds. */
export async function POST(req: Request) {
  if (!config.cronSecret || req.headers.get('authorization') !== config.cronSecret) return fail(401, 'bad webhook auth');
  const body = (await req.json().catch(() => [])) as EnhancedTx[];
  return ok({ added: await ingest(Array.isArray(body) ? body : []) });
}
