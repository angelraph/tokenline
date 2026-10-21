import { alertText, diffAlerts, stateOf, type AlertState } from './alertscore';
import { board } from './board';
import { config } from './config';
import { tokenBalance } from './helius';
import { store } from './store';
import { sendText } from './telegram';

export type Sub = { wallet: string; balance: number; checkedAt: string; linkedAt: string };
const SUBS = 'alerts:subs';
const STATE = 'alerts:state';
const RECHECK_MS = 24 * 3_600_000;

export const subscribers = async () => (await store.getKv<Record<string, Sub>>(SUBS)) ?? {};
export const saveSubscribers = (s: Record<string, Sub>) => store.setKv(SUBS, s);
export const holderMin = () => config.policy.holderMin;
export const holderBalance = (wallet: string) => tokenBalance(wallet, config.mints.tline);

/** Compare the board with the last check and alert every holder still above the minimum. */
export async function runAlerts() {
  const base = config.baseUrl.replace(/\/$/, '');
  const { rows } = await board();
  const prev = await store.getKv<AlertState>(STATE);
  const events = diffAlerts(prev, rows);
  await store.setKv(STATE, stateOf(rows));
  if (!events.length) return { events: 0, sent: 0 };

  const subs = await subscribers();
  const text = alertText(events, base);
  let sent = 0, paused = 0;
  for (const [chatId, sub] of Object.entries(subs)) {
    if (Date.now() - Date.parse(sub.checkedAt) > RECHECK_MS) {
      const bal = await holderBalance(sub.wallet).catch(() => sub.balance);
      sub.balance = bal;
      sub.checkedAt = new Date().toISOString();
      if (bal < holderMin()) {
        delete subs[chatId];
        paused++;
        await sendText(chatId, `Alerts paused: your wallet now holds ${Math.floor(bal).toLocaleString('en-US')} $TOKENL, below the ${holderMin().toLocaleString('en-US')} needed. Send /alerts to link again.`).catch(() => undefined);
        continue;
      }
    }
    await sendText(chatId, text).then(() => sent++).catch(() => undefined);
  }
  await saveSubscribers(subs);
  return { events: events.length, sent, paused };
}
