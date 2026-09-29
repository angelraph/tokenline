import { syncOnchain } from '@/lib/sync';
import { getClawrena } from '@/lib/clawrena';
import { refreshHolders } from '@/lib/holders';
import { ok, fail, isCron } from '@/lib/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Scan the pool/escrow wallets for repayments, collateral and deposits, and refresh
 * holder concentration for agents without a fresh measurement. Called by cron.
 */
async function run(req: Request) {
  if (!isCron(req)) return fail(401, 'cron secret required');
  try {
    const chain = await syncOnchain();
    const feed = await getClawrena();
    const holdersMeasured = await refreshHolders(feed.projects.map((p) => p.mint), 250);
    return ok({ ...chain, holdersMeasured });
  } catch (e) {
    return fail(502, (e as Error).message);
  }
}
export const GET = run;
export const POST = run;
