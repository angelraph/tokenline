import { board } from '@/lib/board';
import { config } from '@/lib/config';
import { fail, isCron, ok } from '@/lib/http';
import { store } from '@/lib/store';
import { movers, recordSnapshot } from '@/lib/watch';
import { composeDigest } from '@/lib/watchbot';
import { postTweet, xConfigured } from '@/lib/xclient';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const LAST = 'bot:watch:last';
const MIN_GAP_MS = 20 * 3_600_000;

type Last = { at: string; ids: string[]; url: string };

/**
 * Daily Credit Watch thread on X. Called by cron; `?preview=1` returns the thread without posting.
 * Posts at most once every 20 hours and stays silent when no agent moved.
 */
async function run(req: Request) {
  if (!isCron(req)) return fail(401, 'cron secret required');
  const preview = new URL(req.url).searchParams.get('preview') === '1';

  const { rows } = await board();
  await recordSnapshot(rows);
  const { since, moves } = await movers(rows, 24);
  const handles = new Map(rows.map((r) => [r.mint, r.xHandle]));
  const base = config.baseUrl.replace(/\/$/, '');
  const posts = since ? composeDigest(moves.map((m) => ({ ...m, xHandle: handles.get(m.mint) ?? null })), since, Date.now(), base) : [];

  const last = await store.getKv<Last>(LAST);
  if (preview) return ok({ posts, moves: moves.length, since: since ? new Date(since).toISOString() : null, configured: xConfigured(), last });
  if (!posts.length) return ok({ posted: 0, reason: since ? 'nothing to post: needs 12h of history and at least one upgrade or new credit line' : 'no score history yet' });
  if (!xConfigured()) return fail(503, 'X API keys are not configured', { posts });
  if (last && Date.now() - Date.parse(last.at) < MIN_GAP_MS) return ok({ posted: 0, reason: 'already posted today', last });

  const ids: string[] = [];
  try {
    for (const text of posts) ids.push(await postTweet(text, ids[ids.length - 1]));
  } catch (e) {
    // Record what did go out so a retry never duplicates the header.
    if (ids.length) await store.setKv(LAST, { at: new Date().toISOString(), ids, url: `https://x.com/${config.xHandle}/status/${ids[0]}` });
    return fail(502, (e as Error).message, { postedIds: ids });
  }
  const rec: Last = { at: new Date().toISOString(), ids, url: `https://x.com/${config.xHandle}/status/${ids[0]}` };
  await store.setKv(LAST, rec);
  return ok({ posted: ids.length, ...rec });
}

export const GET = run;
export const POST = run;
