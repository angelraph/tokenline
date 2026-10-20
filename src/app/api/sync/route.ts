import { syncOnchain } from '@/lib/sync';
import { getClawrena } from '@/lib/clawrena';
import { refreshHolders } from '@/lib/holders';
import { refreshActivity } from '@/lib/activity';
import { refreshDevSells, refreshLaunchDates } from '@/lib/signals';
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
    const mints = feed.projects.map((p) => p.mint);
    const activityChecked = feed.asOf ? await refreshActivity(mints, 15_000) : 0;
    const holdersMeasured = await refreshHolders(mints, 250, 20_000);
    const launchDatesFound = await refreshLaunchDates(mints, 8_000);
    const creatorsMeasured = await refreshDevSells(mints, 60, 20_000);
    return ok({ ...chain, activityChecked, holdersMeasured, launchDatesFound, creatorsMeasured });
  } catch (e) {
    return fail(502, (e as Error).message);
  }
}
export const GET = run;
export const POST = run;
