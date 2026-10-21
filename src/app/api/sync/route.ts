import { syncOnchain } from '@/lib/sync';
import { getClawrena } from '@/lib/clawrena';
import { refreshHolders } from '@/lib/holders';
import { refreshActivity } from '@/lib/activity';
import { board } from '@/lib/board';
import { config } from '@/lib/config';
import { dailyDrafts } from '@/lib/drafts';
import { store } from '@/lib/store';
import { sendText, telegramConfigured } from '@/lib/telegram';
import { esc } from '@/lib/tgformat';
import { movers } from '@/lib/watch';
import { refreshDevSells, refreshLaunchDates } from '@/lib/signals';
import { ok, fail, isCron } from '@/lib/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Scan the pool/escrow wallets for repayments, collateral and deposits, and refresh
 * holder concentration for agents without a fresh measurement. Called by cron.
 */
const TG_EVENING = 'bot:telegram:evening';

/** The evening post (build log or receipts) for the Telegram channel, at most once every 20 hours. */
async function eveningToTelegram() {
  if (!telegramConfigured() || !config.telegram.channel) return 'not configured';
  const last = await store.getKv<{ at: string }>(TG_EVENING);
  if (last && Date.now() - Date.parse(last.at) < 20 * 3_600_000) return 'already posted today';
  const { rows } = await board();
  const { moves } = await movers(rows, 24);
  const { evening } = await dailyDrafts(rows, moves, config.baseUrl.replace(/\/$/, ''));
  await sendText(config.telegram.channel, esc(evening));
  await store.setKv(TG_EVENING, { at: new Date().toISOString() });
  return 'posted';
}

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
    const telegram = left(1) ? await eveningToTelegram().catch((e) => `failed: ${(e as Error).message}`) : 'skipped: out of time';
    return ok({ ...chain, activityChecked, holdersMeasured, launchDatesFound, creatorsMeasured, telegram });
  } catch (e) {
    return fail(502, (e as Error).message);
  }
}
export const GET = run;
export const POST = run;
