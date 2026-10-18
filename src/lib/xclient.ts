import { config } from './config';
import { authHeader } from './oauth1';

const TWEETS = 'https://api.x.com/2/tweets';

export const xConfigured = () => Object.values(config.xApi).every(Boolean);

/** Post as @tokenlinehq. Returns the new post id; throws with X's error text on failure. */
export async function postTweet(text: string, replyTo?: string): Promise<string> {
  const res = await fetch(TWEETS, {
    method: 'POST',
    headers: { authorization: authHeader('POST', TWEETS, config.xApi), 'content-type': 'application/json' },
    body: JSON.stringify(replyTo ? { text, reply: { in_reply_to_tweet_id: replyTo } } : { text }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.data?.id) throw new Error(`x ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  return String(body.data.id);
}

/** Read-only credential check: which account the keys post as, or X's error. Posts nothing. */
export async function whoAmI(): Promise<{ ok: boolean; status: number; body: unknown }> {
  const url = 'https://api.x.com/2/users/me';
  const res = await fetch(url, { headers: { authorization: authHeader('GET', url, config.xApi) }, signal: AbortSignal.timeout(15_000) });
  return { ok: res.ok, status: res.status, body: await res.json().catch(() => null) };
}
