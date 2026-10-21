import { holderBalance, holderMin, saveSubscribers, subscribers } from '@/lib/alerts';
import { linkMessage, readLinkCode } from '@/lib/alertscore';
import { config } from '@/lib/config';
import { fail, ok } from '@/lib/http';
import { isSolanaAddress, verifyWalletSignature } from '@/lib/keys';
import { sendText } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

/** Link a wallet to a Telegram chat for holder alerts: valid code, valid signature, enough $TOKENL on-chain. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const code = String(body?.code ?? '');
  const wallet = String(body?.wallet ?? '');
  const signature = String(body?.signature ?? '');
  if (!isSolanaAddress(wallet)) return fail(400, 'Not a Solana wallet address');
  const chatId = readLinkCode(code, config.quoteSecret, Date.now());
  if (chatId === null) return fail(400, 'This link has expired. Send /alerts to @tokenhqbot for a new one.');
  if (!verifyWalletSignature(wallet, linkMessage(code), signature)) return fail(400, 'The signature does not match this wallet');

  const balance = await holderBalance(wallet);
  const min = holderMin();
  if (balance < min) {
    return fail(403, `This wallet holds ${Math.floor(balance).toLocaleString('en-US')} $TOKENL. Holder alerts need ${min.toLocaleString('en-US')}.`, { balance, min });
  }

  const subs = await subscribers();
  const now = new Date().toISOString();
  subs[String(chatId)] = { wallet, balance, checkedAt: now, linkedAt: subs[String(chatId)]?.linkedAt ?? now };
  await saveSubscribers(subs);
  await sendText(chatId, `Holder alerts are on for ${wallet.slice(0, 4)}...${wallet.slice(-4)} (${Math.floor(balance).toLocaleString('en-US')} $TOKENL).\n\nYou will get upgrades, downgrades, new credit lines and volume spikes as they happen. Send /stop to turn them off.`).catch(() => undefined);
  return ok({ linked: true, balance });
}
