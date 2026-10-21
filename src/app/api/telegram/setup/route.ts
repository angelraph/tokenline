import { config } from '@/lib/config';
import { fail, isAdmin, ok } from '@/lib/http';
import { tg, telegramConfigured, webhookSecret } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

const COMMANDS = [
  { command: 'score', description: 'Credit report for any Clawrena agent' },
  { command: 'top', description: 'Top rated agents' },
  { command: 'watch', description: 'Upgrades and downgrades today' },
  { command: 'ledger', description: 'Draws, repayments and buybacks' },
  { command: 'token', description: '$TOKENL contract and links' },
  { command: 'alerts', description: 'Live alerts for $TOKENL holders' },
  { command: 'stop', description: 'Turn holder alerts off' },
  { command: 'help', description: 'What Tokenline does' },
];

/**
 * Admin only. Registers the webhook and command menu, then reports whether the bot can post in the channel.
 * Reads and configuration only: it never posts to the channel.
 */
export async function GET(req: Request) {
  if (!isAdmin(req)) return fail(401, 'admin token required');
  if (!telegramConfigured()) return fail(503, 'TELEGRAM_BOT_TOKEN is not set');
  try {
    const me = await tg<{ id: number; username: string }>('getMe', {});
    const url = `${config.baseUrl.replace(/\/$/, '')}/api/telegram/webhook`;
    await tg('setWebhook', { url, secret_token: webhookSecret(), allowed_updates: ['message'], drop_pending_updates: true });
    await tg('setMyCommands', { commands: COMMANDS });
    let channel: unknown = 'TELEGRAM_CHANNEL is not set';
    if (config.telegram.channel) {
      channel = await tg<{ status: string }>('getChatMember', { chat_id: config.telegram.channel, user_id: me.id })
        .then((m) => ({ chat: config.telegram.channel, botStatus: m.status, canPost: m.status === 'administrator' || m.status === 'creator' }))
        .catch((e) => ({ chat: config.telegram.channel, error: (e as Error).message }));
    }
    return ok({ bot: `@${me.username}`, webhook: url, commands: COMMANDS.length, channel });
  } catch (e) {
    return fail(502, (e as Error).message);
  }
}
