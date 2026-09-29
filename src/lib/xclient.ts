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
