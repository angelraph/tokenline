// Tokenline underwriting model. Pure and deterministic: the same inputs always
// give the same score, so anyone can recompute a grade from public data.

export type ScoreInput = {
  grossFeesSol: number;
  platformFeesSol: number;
  collections: number;
  firstFeeAt: string | null;
  lastFeeAt: string | null;
  volume24hUsd: number;
  solPriceUsd: number;
  /** Share of supply held by the top 10 accounts, 0..1. Undefined = unknown. */
  top10Share?: number;
  /** Tokenline's own history with this agent. */
  history?: { drawnUsd: number; repaidUsd: number; overdue: boolean };
  now?: number;
};

export type Policy = { baseLineCapUsd: number; staleDays: number };

export type Grade = 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'C';

export type ScoreResult = {
  score: number;
  grade: Grade;
  lineUsd: number;
  monthlyCreatorUsd: number;
  stale: boolean;
  components: { key: string; label: string; points: number; max: number; detail: string }[];
};

const DAY = 86_400_000;
const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const logScale = (v: number, full: number) => clamp(Math.log10(1 + Math.max(0, v)) / Math.log10(1 + full));
const r2 = (x: number) => Math.round(x * 100) / 100;

export function gradeFor(score: number): Grade {
  if (score >= 800) return 'AAA';
  if (score >= 700) return 'AA';
  if (score >= 600) return 'A';
  if (score >= 500) return 'BBB';
  if (score >= 400) return 'BB';
  if (score >= 300) return 'B';
  return 'C';
}

export function scoreAgent(i: ScoreInput, policy: Policy): ScoreResult {
  const now = i.now ?? Date.now();
  const first = i.firstFeeAt ? Date.parse(i.firstFeeAt) : NaN;
  const last = i.lastFeeAt ? Date.parse(i.lastFeeAt) : NaN;
  const daysLive = Number.isFinite(first) ? Math.max(1, (now - first) / DAY) : 0;
  const hoursSinceFee = Number.isFinite(last) ? (now - last) / 3_600_000 : Infinity;

  const creatorFeesSol = Math.max(0, i.grossFeesSol - i.platformFeesSol);
  const monthlyCreatorUsd = daysLive ? (creatorFeesSol * i.solPriceUsd * 30) / daysLive : 0;

  const components: ScoreResult['components'] = [];
  const add = (key: string, label: string, points: number, max: number, detail: string) =>
    components.push({ key, label, points: Math.round(points), max, detail });

  add('revenue', 'Creator-fee revenue', 350 * logScale(monthlyCreatorUsd, 20_000), 350,
    `$${r2(monthlyCreatorUsd).toLocaleString()} / month run-rate to the creator`);

  const recency = hoursSinceFee <= 24 ? 200 : hoursSinceFee <= 72 ? 150 : hoursSinceFee <= 168 ? 80 : 0;
  add('recency', 'Fee recency', recency, 200,
    Number.isFinite(hoursSinceFee) ? `last fee ${Math.round(hoursSinceFee)}h ago` : 'no fees collected yet');

  const perDay = daysLive ? i.collections / daysLive : 0;
  add('consistency', 'Consistency', clamp(perDay / 2) * 120 + clamp(daysLive / 30) * 80, 200,
    `${i.collections} fee collections over ${Math.round(daysLive)} days`);

  add('momentum', 'Market momentum', 150 * logScale(i.volume24hUsd, 100_000), 150,
    `$${Math.round(i.volume24hUsd).toLocaleString()} 24h volume`);

  const dist = i.top10Share === undefined ? 50 : 100 * (1 - clamp((i.top10Share - 0.2) / 0.6));
  add('distribution', 'Holder distribution', dist, 100,
    i.top10Share === undefined ? 'not yet measured (neutral)' : `top 10 hold ${Math.round(i.top10Share * 100)}%`);

  let score = components.reduce((s, c) => s + c.points, 0);

  if (i.history) {
    const { drawnUsd, repaidUsd, overdue } = i.history;
    if (overdue) {
      add('history', 'Repayment history', -300, 0, 'overdue balance');
      score -= 300;
    } else if (repaidUsd > 0) {
      const bonus = Math.min(50, 10 + 40 * clamp(repaidUsd / Math.max(drawnUsd, 1)));
      add('history', 'Repayment history', bonus, 50, `repaid $${r2(repaidUsd)} of $${r2(drawnUsd)}`);
      score += bonus;
    }
  }

  score = Math.round(clamp(score, 0, 1000));
  const grade = gradeFor(score);
  const stale = !Number.isFinite(hoursSinceFee) || hoursSinceFee > policy.staleDays * 24;
  const lineUsd = grade === 'C' || stale
    ? 0
    : r2(Math.min(policy.baseLineCapUsd, 0.1 * monthlyCreatorUsd) * (score / 1000));

  return { score, grade, lineUsd, monthlyCreatorUsd: r2(monthlyCreatorUsd), stale, components };
}
