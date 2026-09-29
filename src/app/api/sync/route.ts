import { syncOnchain } from '@/lib/sync';
import { ok, fail, isCron } from '@/lib/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Scan the pool/escrow wallets for repayments, collateral and deposits. Called by cron. */
async function run(req: Request) {
  if (!isCron(req)) return fail(401, 'cron secret required');
  try { return ok(await syncOnchain()); } catch (e) { return fail(502, (e as Error).message); }
}
export const GET = run;
export const POST = run;
