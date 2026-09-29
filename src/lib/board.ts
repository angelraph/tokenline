import { config } from './config';
import { getClawrena } from './clawrena';
import { scoreAgent, type Grade } from './score';
import { store } from './store';
import { tally } from './account';
import { recordSnapshot } from './watch';
import { spenderKeypair, upstreamMode } from './usepod';
import { freshShare, holderCache, refreshHolders } from './holders';
import { refreshDevSells, refreshLaunchDates, signalCaches, signalsFor } from './signals';
import { waitUntil } from '@vercel/functions';

export type BoardRow = {
  rank: number;
  mint: string;
  project: string;
  symbol: string;
  xHandle: string | null;
  score: number;
  grade: Grade;
  lineUsd: number;
  monthlyCreatorUsd: number;
  feesSol: number;
  volume24hUsd: number;
  lastFeeAt: string | null;
  stale: boolean;
  onTokenline: boolean;
  verified: boolean;
  outstandingUsd: number;
};

export async function board(): Promise<{ rows: BoardRow[]; solPriceUsd: number; projects: number }> {
  const [feed, agents, events, holders, signals] = await Promise.all([
    getClawrena(), store.listAgents(), store.listEvents({ limit: 100_000 }), holderCache(), signalCaches(),
  ]);
  const byMint = new Map(agents.filter((a) => a.mint).map((a) => [a.mint!, a]));
  const mints = feed.projects.map((p) => p.mint);
  // Fill missing measurements after the response is sent, so pages stay fast.
  waitUntil((async () => {
    await refreshHolders(mints).catch(() => 0);
    await refreshLaunchDates(mints).catch(() => 0);
    await refreshDevSells(mints, 10).catch(() => 0);
  })());
  const rows = feed.projects.map((p) => {
    const agent = byMint.get(p.mint);
    const t = agent ? tally(events.filter((e) => e.agentId === agent.id)) : null;
    const s = scoreAgent({
      ...p, ...signalsFor(signals, p.mint, p.firstFeeAt), solPriceUsd: feed.solPriceUsd, top10Share: freshShare(holders, p.mint), history: t ?? undefined,
    }, config.policy);
    return {
      rank: 0, mint: p.mint, project: p.projectName, symbol: p.symbol, xHandle: p.xHandle,
      score: s.score, grade: s.grade, lineUsd: s.lineUsd, monthlyCreatorUsd: s.monthlyCreatorUsd,
      feesSol: Math.round((p.grossFeesSol - p.platformFeesSol) * 1000) / 1000,
      volume24hUsd: p.volume24hUsd, lastFeeAt: p.lastFeeAt, stale: s.stale,
      onTokenline: !!agent, verified: !!agent?.verified, outstandingUsd: t ? Math.round(t.outstandingUsd * 100) / 100 : 0,
    };
  });
  rows.sort((a, b) => b.score - a.score || b.monthlyCreatorUsd - a.monthlyCreatorUsd);
  rows.forEach((r, i) => (r.rank = i + 1));
  // Only snapshot once every signal has been attempted for nearly every agent, so Watch never
  // compares half-measured scores. Creator checks count once attempted, even when unmeasurable.
  const n = feed.projects.length;
  const covered = (f: (m: string) => boolean) => mints.filter(f).length / Math.max(1, n);
  const ready = n > 0
    && covered((m) => freshShare(holders, m) !== undefined) >= 0.9
    && feed.projects.filter((p) => signalsFor(signals, p.mint, p.firstFeeAt).launchedAt !== undefined).length / n >= 0.9
    && covered((m) => signals.dev[m] !== undefined) >= 0.9;
  if (ready) await recordSnapshot(rows).catch(() => undefined);
  return { rows, solPriceUsd: feed.solPriceUsd, projects: feed.projects.length };
}

export async function poolStats() {
  const [agents, events] = await Promise.all([store.listAgents(), store.listEvents({ limit: 100_000 })]);
  let drawnUsd = 0, upstreamUsd = 0, repaidUsd = 0, depositsUsd = 0, draws = 0, tokensServed = 0, salesUsd = 0, reportsSold = 0;
  for (const e of events) {
    if (e.type === 'draw') {
      drawnUsd += e.amountUsd; draws++;
      upstreamUsd += Number(e.meta?.upstreamUsd ?? 0);
      tokensServed += Number(e.meta?.inputTokens ?? 0) + Number(e.meta?.outputTokens ?? 0);
    }
    if (e.type === 'repay') repaidUsd += e.amountUsd;
    if (e.type === 'deposit') depositsUsd += e.amountUsd;
    if (e.type === 'sale') { salesUsd += e.amountUsd; reportsSold++; }
  }
  let overdueUsd = 0, outstandingUsd = 0;
  for (const a of agents) {
    const t = tally(events.filter((e) => e.agentId === a.id));
    outstandingUsd += t.outstandingUsd;
    if (t.overdue) overdueUsd += t.outstandingUsd;
  }
  const r2 = (x: number) => Math.round(x * 1e6) / 1e6;
  return {
    agents: agents.length,
    verifiedAgents: agents.filter((a) => a.verified).length,
    draws,
    tokensServed,
    drawnUsd: r2(drawnUsd),
    repaidUsd: r2(repaidUsd),
    outstandingUsd: r2(outstandingUsd),
    depositsUsd: r2(depositsUsd),
    spreadRevenueUsd: r2(drawnUsd - upstreamUsd),
    reportsSold,
    reportRevenueUsd: r2(salesUsd),
    overdueUsd: r2(overdueUsd),
    defaultRate: drawnUsd ? r2((overdueUsd / drawnUsd) * 100) : 0,
    lastSyncAt: await store.getKv<string>('lastSyncAt'),
    poolWallet: config.poolWallet || null,
    escrowWallet: config.escrowWallet || null,
    upstream: upstreamMode(),
    spenderWallet: spenderAddress(),
  };
}

/** Public address of the hot wallet that pays UsePod per call (x402 mode). */
function spenderAddress(): string | null {
  if (upstreamMode() !== 'x402') return null;
  try { return spenderKeypair().publicKey.toBase58(); } catch { return null; }
}
