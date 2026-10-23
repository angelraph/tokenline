import type { BoardRow } from './board';
import { poolStats } from './board';
import { recentShip } from './changelog';
import { config } from './config';
import { buybackAnnouncement, buybackReceipt, dailyProductPost, eveningPost, middayInsightPost } from './dailypost';
import type { Move } from './watch';
import { store } from './store';

/** Today's three posts (morning product, midday live data, evening build log or receipts) from live numbers. */
export async function dailyDrafts(rows: BoardRow[], moves: Move[], base: string, now = Date.now()) {
  const pool = await poolStats();
  const day = Math.floor(now / 86_400_000);
  const handle = new Map(rows.map((r) => [r.mint, r.xHandle]));
  const top = rows[0];
  const busiest = [...rows].sort((a, b) => b.volume24hUsd - a.volume24hUsd)[0];
  // Only upgrades worth celebrating: the agent lands at grade A or better.
  const upgrade = moves.filter((m) => m.kind === 'upgrade' && m.to >= 600).sort((a, b) => b.delta - a.delta)[0];
  const approved = rows.filter((r) => r.lineUsd > 0).length;
  const top3 = rows.slice(0, 3).map((r) => ({ project: r.project, grade: r.grade, score: r.score }));

  const morning = dailyProductPost({
    base, agents: rows.length, approved, trading: rows.filter((r) => r.volume24hUsd >= 50).length,
    top: top ? { project: top.project, xHandle: top.xHandle, grade: top.grade, score: top.score, monthlyCreatorUsd: top.monthlyCreatorUsd, mint: top.mint } : null,
    draws: pool.draws, buybacks: pool.buybackCount, tokenMint: config.mints.tline, top3,
  }, day);

  const midday = middayInsightPost({
    base,
    trading: rows.filter((r) => r.volume24hUsd >= 50).length,
    approved,
    aaa: rows.filter((r) => r.grade === 'AAA').length,
    totalVol24: rows.reduce((s, r) => s + r.volume24hUsd, 0),
    busiest: busiest && busiest.volume24hUsd > 0
      ? { project: busiest.project, xHandle: busiest.xHandle, grade: busiest.grade, vol24: busiest.volume24hUsd, mint: busiest.mint }
      : null,
    top3,
    upgrade: upgrade ? { project: upgrade.project, xHandle: handle.get(upgrade.mint) ?? null, from: upgrade.from, to: upgrade.to, grade: upgrade.gradeTo, mint: upgrade.mint } : null,
  }, day);

  const evening = eveningPost({
    base, shipped: recentShip(now), draws: pool.draws, repaidUsd: pool.repaidUsd,
    reportsSold: pool.reportsSold, buybacks: pool.buybackCount, buybackUsd: pool.buybackUsd,
  }, day);

  const pct = config.policy.creatorBuybackPct;
  const last = pool.buybacks[0];
  const receipt = last && last.signature && now - Date.parse(last.at) < 36 * 3_600_000
    ? buybackReceipt({ amount: last.amount, usd: last.usd, signature: last.signature, isTokenl: last.asset === config.mints.tline, source: last.source, burned: last.burned }, pct)
    : null;
  const announcement = pct ? buybackAnnouncement(pct, base) : null;

  return { morning, midday, evening, receipt, announcement };
}

export type DayPosts = { date: string; savedAt: string; posts: Record<string, string> };
const ARCHIVE = 'posts:archive';
const KEEP_DAYS = 14;

/** Saves today's posts (overwriting earlier versions from today) and returns the archive, newest first. */
export async function saveDay(drafts: Record<string, string | null>, now = Date.now()): Promise<DayPosts[]> {
  const date = new Date(now).toISOString().slice(0, 10);
  const posts = Object.fromEntries(Object.entries(drafts).filter((e): e is [string, string] => !!e[1]));
  const all = (await store.getKv<Record<string, DayPosts>>(ARCHIVE)) ?? {};
  all[date] = { date, savedAt: new Date(now).toISOString(), posts };
  const kept = Object.fromEntries(Object.entries(all).sort(([a], [b]) => b.localeCompare(a)).slice(0, KEEP_DAYS));
  await store.setKv(ARCHIVE, kept);
  return Object.values(kept);
}
