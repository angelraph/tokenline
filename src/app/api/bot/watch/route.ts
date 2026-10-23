import { board } from '@/lib/board';
import { dailyDrafts, saveDay } from '@/lib/drafts';
import { config } from '@/lib/config';
import { fail, isCron, ok } from '@/lib/http';
import { store } from '@/lib/store';
import { movers, recordSnapshot } from '@/lib/watch';
import { composeDigest } from '@/lib/watchbot';
import { postTweet, whoAmI, xConfigured } from '@/lib/xclient';
import { sendText, telegramConfigured } from '@/lib/telegram';
import { dailyMessage, esc } from '@/lib/tgformat';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const LAST = 'bot:watch:last';
const ERR = 'bot:watch:lastError';
const DRAFT = 'bot:watch:draft';
const TG_DAILY = 'bot:telegram:last';
const MIN_GAP_MS = 20 * 3_600_000;

type Last = { at: string; ids: string[]; url: string };

/**
 * Daily Credit Watch thread for X. Called by cron; `?preview=1` returns the thread without posting.
 * By default the thread is saved as a draft for the operator; X_AUTOPOST=1 posts it through the X API.
 * Posts at most once every 20 hours and stays silent when no agent moved.
 */
async function run(req: Request) {
  if (!isCron(req)) return fail(401, 'cron secret required');
  const params = new URL(req.url).searchParams;
  const preview = params.get('preview') === '1';
  // Read-only: confirms which account the keys belong to, or returns X's error. Posts nothing.
  if (params.get('check') === '1') return ok({ configured: xConfigured(), x: xConfigured() ? await whoAmI() : null, lastError: await store.getKv(ERR) });

  const { rows } = await board();
  await recordSnapshot(rows);
  const { since, moves } = await movers(rows, 24);
  const handles = new Map(rows.map((r) => [r.mint, r.xHandle]));
  const base = config.baseUrl.replace(/\/$/, '');
  const drafts = await dailyDrafts(rows, moves, base);
  const product = drafts.morning;
  const archive = await saveDay(drafts);
  const posts = since ? composeDigest(moves.map((m) => ({ ...m, xHandle: handles.get(m.mint) ?? null })), since, Date.now(), base) : [];

  const last = await store.getKv<Last>(LAST);
  if (preview) return ok({ product, drafts, archive, posts, moves: moves.length, since: since ? new Date(since).toISOString() : null, autopost: config.xAutopost, configured: xConfigured(), last, lastError: await store.getKv(ERR), draft: await store.getKv(DRAFT) });
  // Telegram channel: one post a day, the digest on good days and a board snapshot otherwise.
  let telegram: unknown = 'not configured';
  if (telegramConfigured() && config.telegram.channel) {
    const tgLast = await store.getKv<{ at: string }>(TG_DAILY);
    if (tgLast && Date.now() - Date.parse(tgLast.at) < MIN_GAP_MS) telegram = 'already posted today';
    else {
      telegram = await sendText(config.telegram.channel, posts.length ? dailyMessage(posts, rows, base) : esc(drafts.midday))
        .then(async () => { await store.setKv(TG_DAILY, { at: new Date().toISOString() }); return 'posted'; })
        .catch((e) => `failed: ${(e as Error).message}`);
    }
  }

  if (!posts.length) return ok({ posted: 0, telegram, reason: since ? 'nothing to post: needs 12h of history and at least one upgrade or new credit line' : 'no score history yet' });
  // Draft mode (default): save the thread for the operator to post by hand from the admin page.
  if (!config.xAutopost) {
    const draft = { at: new Date().toISOString(), since: new Date(since!).toISOString(), posts };
    await store.setKv(DRAFT, draft);
    return ok({ posted: 0, draft, telegram });
  }
  if (!xConfigured()) {
    await store.setKv(ERR, { at: new Date().toISOString(), error: 'X API keys are not configured' });
    return fail(503, 'X API keys are not configured', { posts });
  }
  if (last && Date.now() - Date.parse(last.at) < MIN_GAP_MS) return ok({ posted: 0, reason: 'already posted today', last });

  const ids: string[] = [];
  try {
    for (const text of posts) ids.push(await postTweet(text, ids[ids.length - 1]));
  } catch (e) {
    // Record what did go out so a retry never duplicates the header.
    await store.setKv(ERR, { at: new Date().toISOString(), error: (e as Error).message, postedIds: ids });
    if (ids.length) await store.setKv(LAST, { at: new Date().toISOString(), ids, url: `https://x.com/${config.xHandle}/status/${ids[0]}` });
    return fail(502, (e as Error).message, { postedIds: ids });
  }
  const rec: Last = { at: new Date().toISOString(), ids, url: `https://x.com/${config.xHandle}/status/${ids[0]}` };
  await store.setKv(LAST, rec);
  return ok({ posted: ids.length, ...rec });
}

export const GET = run;
export const POST = run;
