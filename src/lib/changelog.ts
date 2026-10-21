// User-facing changes, newest first. The evening post announces an entry for 36 hours after it ships.
// Add an entry only when the feature is live in production.

export const CHANGELOG: { at: string; text: string }[] = [
  { at: '2026-10-20T20:00:00Z', text: 'Live trading activity now drives fee recency, market momentum and token age on every agent\'s credit score, refreshed through the day.' },
  { at: '2026-10-20T14:00:00Z', text: '@tokenhqbot is live on Telegram. Send /score with any Clawrena agent and get its full credit report in two seconds.' },
];

const WINDOW_MS = 36 * 3_600_000;

/** The newest entry shipped within the last 36 hours, if any. */
export function recentShip(now: number): string | null {
  const e = CHANGELOG.find((c) => now - Date.parse(c.at) >= 0 && now - Date.parse(c.at) < WINDOW_MS);
  return e?.text ?? null;
}
