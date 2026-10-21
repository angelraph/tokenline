import { createHmac, timingSafeEqual } from 'node:crypto';

// Holder alerts: what changed on the board since the last check, and the one-time link codes that tie a
// Telegram chat to a wallet. No app imports, so tests run the same code.

export type AlertRow = { mint: string; project: string; grade: string; score: number; lineUsd: number; volume24hUsd: number };
export type AlertState = Record<string, { score: number; grade: string; line: number; vol24: number }>;
export type AlertEvent =
  | { kind: 'upgrade' | 'downgrade'; mint: string; project: string; from: number; to: number; grade: string }
  | { kind: 'new_line' | 'line_paused'; mint: string; project: string; line: number }
  | { kind: 'volume_spike'; mint: string; project: string; from: number; to: number };

export const stateOf = (rows: AlertRow[]): AlertState =>
  Object.fromEntries(rows.map((r) => [r.mint, { score: r.score, grade: r.grade, line: r.lineUsd, vol24: r.volume24hUsd }]));

const MOVE = 25;
const SPIKE_X = 3;
const SPIKE_MIN_USD = 5_000;

/** Changes worth an alert. The first run has nothing to compare against and returns none. */
export function diffAlerts(prev: AlertState | null, rows: AlertRow[]): AlertEvent[] {
  if (!prev) return [];
  const out: AlertEvent[] = [];
  for (const r of rows) {
    const p = prev[r.mint];
    if (!p) continue;
    const d = r.score - p.score;
    if (d >= MOVE) out.push({ kind: 'upgrade', mint: r.mint, project: r.project, from: p.score, to: r.score, grade: r.grade });
    if (d <= -MOVE) out.push({ kind: 'downgrade', mint: r.mint, project: r.project, from: p.score, to: r.score, grade: r.grade });
    if (p.line === 0 && r.lineUsd > 0) out.push({ kind: 'new_line', mint: r.mint, project: r.project, line: r.lineUsd });
    if (p.line > 0 && r.lineUsd === 0) out.push({ kind: 'line_paused', mint: r.mint, project: r.project, line: p.line });
    if (r.volume24hUsd >= SPIKE_MIN_USD && r.volume24hUsd >= SPIKE_X * Math.max(1, p.vol24)) {
      out.push({ kind: 'volume_spike', mint: r.mint, project: r.project, from: p.vol24, to: r.volume24hUsd });
    }
  }
  return out;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const usd = (x: number) => `$${Math.round(x).toLocaleString('en-US')}`;

/** One Telegram message for a batch of alerts, most important first. */
export function alertText(events: AlertEvent[], base: string, max = 8): string {
  const rank = { volume_spike: 0, upgrade: 1, new_line: 2, downgrade: 3, line_paused: 4 } as const;
  const sorted = [...events].sort((a, b) => rank[a.kind] - rank[b.kind]);
  const line = (e: AlertEvent) => {
    const name = `<b>${esc(e.project)}</b>`;
    switch (e.kind) {
      case 'volume_spike': return `Volume spike: ${name} traded ${usd(e.to)} in 24h, up from ${usd(e.from)}`;
      case 'upgrade': return `Upgrade: ${name} ${e.from} to ${e.to}, now ${esc(e.grade)}`;
      case 'downgrade': return `Downgrade: ${name} ${e.from} to ${e.to}, now ${esc(e.grade)}`;
      case 'new_line': return `New credit line: ${name}, $${e.line.toFixed(2)} pre-approved`;
      case 'line_paused': return `Line paused: ${name} stopped trading`;
    }
  };
  const shown = sorted.slice(0, max).map((e) => `${line(e)}\n${base}/agent/${e.mint}`);
  const more = sorted.length > max ? [`and ${sorted.length - max} more on ${base}/watch`] : [];
  return ['<b>Tokenline holder alert</b>', '', ...shown, ...more].join('\n\n');
}

/** A link code that ties a Telegram chat to a wallet signature, valid for 30 minutes. */
export function makeLinkCode(chatId: number, secret: string, now: number): string {
  const body = `${chatId}.${now + 30 * 60_000}`;
  const mac = createHmac('sha256', secret).update(`alerts:${body}`).digest('base64url').slice(0, 22);
  return `${Buffer.from(body).toString('base64url')}.${mac}`;
}

export function readLinkCode(code: string, secret: string, now: number): number | null {
  const [b64, mac] = code.split('.');
  if (!b64 || !mac) return null;
  const body = Buffer.from(b64, 'base64url').toString();
  const want = createHmac('sha256', secret).update(`alerts:${body}`).digest('base64url').slice(0, 22);
  if (want.length !== mac.length || !timingSafeEqual(Buffer.from(want), Buffer.from(mac))) return null;
  const [chat, exp] = body.split('.').map(Number);
  return Number.isFinite(chat) && Number.isFinite(exp) && now <= exp ? chat : null;
}

/** The exact message a holder signs to link a wallet. */
export const linkMessage = (code: string) => `Tokenline holder alerts\nLink this wallet to my Telegram chat.\ncode: ${code}`;
