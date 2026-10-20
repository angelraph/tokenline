import { createHash } from 'node:crypto';
import { config } from './config';

// Telegram Bot API. Free to use; the bot token lives only in Vercel as TELEGRAM_BOT_TOKEN.

const api = (method: string) => `https://api.telegram.org/bot${config.telegram.token}/${method}`;

export const telegramConfigured = () => !!config.telegram.token;

/** Secret Telegram echoes on every webhook call, derived from the bot token so no extra variable is needed. */
export const webhookSecret = () => createHash('sha256').update(`tokenline-webhook:${config.telegram.token}`).digest('hex').slice(0, 48);

export async function tg<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(api(method), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const j = await res.json().catch(() => ({}));
  if (!j.ok) throw new Error(`telegram ${method}: ${j.description ?? res.status}`);
  return j.result as T;
}

/** Send HTML text. `preview` picks the link whose card (for example an agent's share card) is shown large. */
export function sendText(chatId: string | number, text: string, preview?: string) {
  return tg('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    link_preview_options: preview ? { url: preview, prefer_large_media: true } : { is_disabled: true },
  });
}
