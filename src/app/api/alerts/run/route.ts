import { runAlerts } from '@/lib/alerts';
import { fail, isCron, ok } from '@/lib/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Holder alerts. Called every 30 minutes by the GitHub Actions schedule (Vercel's free plan only runs daily jobs). */
async function run(req: Request) {
  if (!isCron(req)) return fail(401, 'cron secret required');
  try {
    return ok(await runAlerts());
  } catch (e) {
    return fail(502, (e as Error).message);
  }
}

export const GET = run;
export const POST = run;
