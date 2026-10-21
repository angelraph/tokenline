import { scoreForMint } from '@/lib/account';
import { board, poolStats } from '@/lib/board';
import { config } from '@/lib/config';
import { sendText, telegramConfigured, webhookSecret } from '@/lib/telegram';
import { findAgent, helpMessage, ledgerMessage, scoreMessage, tokenMessage, topMessage, watchMessage } from '@/lib/tgformat';
import { movers } from '@/lib/watch';
import { holderMin, saveSubscribers, subscribers } from '@/lib/alerts';
import { makeLinkCode } from '@/lib/alertscore';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const base = () => config.baseUrl.replace(/\/$/, '');

async function answer(chatId: number, text: string) {
  const [cmd, ...rest] = text.trim().split(/\s+/);
  const command = cmd.toLowerCase().replace(/@\w+$/, '');
  const arg = rest.join(' ');

  if (command === '/start' || command === '/help') return sendText(chatId, helpMessage(base()));
  if (command === '/token') return sendText(chatId, tokenMessage(config.mints.tline, base()));
  if (command === '/alerts') {
    const sub = (await subscribers())[String(chatId)];
    if (sub) return sendText(chatId, `Holder alerts are on for ${sub.wallet.slice(0, 4)}...${sub.wallet.slice(-4)}. Send /stop to turn them off.`);
    const link = `${base()}/alerts?c=${makeLinkCode(chatId, config.quoteSecret, Date.now())}`;
    return sendText(chatId, `<b>Holder alerts</b>\n\nWallets holding ${holderMin().toLocaleString('en-US')}+ $TOKENL get upgrades, downgrades, new credit lines and volume spikes the moment they happen.\n\nOpen this link and sign one message with your wallet (free, moves no funds). It is valid for 30 minutes:\n${link}`);
  }
  if (command === '/stop') {
    const subs = await subscribers();
    if (!subs[String(chatId)]) return sendText(chatId, 'Holder alerts are not on for this chat. Send /alerts to turn them on.');
    delete subs[String(chatId)];
    await saveSubscribers(subs);
    return sendText(chatId, 'Holder alerts are off. Send /alerts any time to turn them back on.');
  }
  if (command === '/ledger') return sendText(chatId, ledgerMessage(await poolStats(), base()));

  const { rows } = await board();
  if (command === '/top') return sendText(chatId, topMessage(rows, base()));
  if (command === '/watch') return sendText(chatId, watchMessage((await movers(rows, 24)).moves, rows, base()));

  // /score <query>, or a bare name or mint typed in a private chat.
  const query = command === '/score' ? arg : command.startsWith('/') ? '' : text;
  if (!query) return sendText(chatId, command === '/score' ? 'Send a name, ticker or mint, for example: /score SP3ND' : helpMessage(base()));
  const row = findAgent(rows, query);
  if (!row) return sendText(chatId, `No Clawrena agent matches "${query.slice(0, 60).replace(/[<>&]/g, '')}". Try a ticker or paste the token mint.`);
  const report = await scoreForMint(row.mint).catch(() => null);
  const factors = (report?.score.components ?? []).filter((c) => c.max > 0).map((c) => ({ label: c.label, points: c.points, max: c.max }));
  const url = `${base()}/agent/${row.mint}`;
  return sendText(chatId, scoreMessage(row, factors, rows.length, base()), url);
}

/** Telegram webhook. Always answers 200 so Telegram does not retry; failures are logged. */
export async function POST(req: Request) {
  if (!telegramConfigured() || req.headers.get('x-telegram-bot-api-secret-token') !== webhookSecret()) {
    return new Response('forbidden', { status: 403 });
  }
  const update = await req.json().catch(() => null);
  const msg = update?.message;
  if (msg?.text && msg.chat?.id) {
    await answer(msg.chat.id, String(msg.text)).catch((e) => console.error('telegram reply failed', (e as Error).message));
  }
  return new Response('ok');
}
