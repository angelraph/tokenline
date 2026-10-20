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
    // Every step shares one deadline so the job always finishes inside Vercel's 60 second limit.
    const deadline = Date.now() + 50_000;
    const left = (cap: number) => Math.max(0, Math.min(cap, deadline - Date.now()));
    const chain = await syncOnchain();
    const feed = await getClawrena();
    const mints = feed.projects.map((p) => p.mint);
    const activityChecked = feed.asOf ? await refreshActivity(mints, left(14_000)) : 0;
    const holdersMeasured = left(1) ? await refreshHolders(mints, 250, left(14_000)) : 0;
    const launchDatesFound = left(1) ? await refreshLaunchDates(mints, left(6_000)) : 0;
    const creatorsMeasured = left(1) ? await refreshDevSells(mints, 60, left(12_000)) : 0;
    return ok({ ...chain, activityChecked, holdersMeasured, launchDatesFound, creatorsMeasured });
  } catch (e) {
    return fail(502, (e as Error).message);
  }
}
export const GET = run;
export const POST = run;
