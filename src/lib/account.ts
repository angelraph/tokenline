import { config } from './config';
import { findProject } from './clawrena';
import { tokenBalance } from './helius';
import { holderShare } from './holders';
import { assetUsd } from './prices';
import { scoreAgent, type ScoreResult } from './score';
import { store, type Agent, type LedgerEvent } from './store';

export type Position = {
  drawnUsd: number;
  repaidUsd: number;
  outstandingUsd: number;
  /** Repaid beyond what was drawn; spendable like credit. */
  prepaidUsd: number;
  collateral: { asset: string; amount: number; usd: number }[];
  collateralUsd: number;
  unsecuredLineUsd: number;
  securedLineUsd: number;
  holderBoost: boolean;
  limitUsd: number;
  availableUsd: number;
  overdue: boolean;
  status: 'active' | 'frozen' | 'overdue' | 'pending_verification' | 'no_line';
  score: ScoreResult | null;
};

const DAY = 86_400_000;
const r2 = (x: number) => Math.round(x * 100) / 100;
const r6 = (x: number) => Math.round(x * 1e6) / 1e6;

export function tally(events: LedgerEvent[]) {
  let drawnUsd = 0, repaidUsd = 0;
  const coll = new Map<string, number>();
  let lastRepayAt = 0, firstDrawAt = 0;
  for (const e of events) {
    const t = Date.parse(e.at);
    if (e.type === 'draw') { drawnUsd += e.amountUsd; firstDrawAt = firstDrawAt ? Math.min(firstDrawAt, t) : t; }
    if (e.type === 'repay') { repaidUsd += e.amountUsd; lastRepayAt = Math.max(lastRepayAt, t); }
    if (e.type === 'collateral' && e.asset) coll.set(e.asset, (coll.get(e.asset) ?? 0) + (e.amount ?? 0));
    if (e.type === 'collateral_release' && e.asset) coll.set(e.asset, (coll.get(e.asset) ?? 0) - (e.amount ?? 0));
  }
  const net = drawnUsd - repaidUsd;
  const outstandingUsd = Math.max(0, net);
  const prepaidUsd = Math.max(0, -net);
  const clock = lastRepayAt || firstDrawAt;
  const overdue = outstandingUsd > 0.01 && !!clock && Date.now() - clock > config.policy.overdueDays * DAY;
  return { drawnUsd, repaidUsd, outstandingUsd, prepaidUsd, coll, overdue };
}

export async function scoreForMint(mint: string, history?: { drawnUsd: number; repaidUsd: number; overdue: boolean }) {
  const { feed, project } = await findProject(mint);
  if (!project) return null;
  const top10 = await holderShare(mint);
  return {
    project,
    score: scoreAgent({ ...project, solPriceUsd: feed.solPriceUsd, top10Share: top10, history }, config.policy),
  };
}

export async function position(agent: Agent): Promise<Position> {
  const events = await store.listEvents({ agentId: agent.id, limit: 10_000 });
  const t = tally(events);

  const collateral = await Promise.all(
    [...t.coll.entries()].filter(([, amt]) => amt > 0).map(async ([asset, amount]) => {
      const px = await assetUsd(asset);
      return { asset, amount, usd: r2(amount * px) };
    }),
  );
  const collateralUsd = r2(collateral.reduce((s, c) => s + c.usd, 0));

  const scored = agent.mint ? await scoreForMint(agent.mint, t) : null;
  const score = scored?.score ?? null;

  const holderBoost = config.mints.tline
    ? (await tokenBalance(agent.wallet, config.mints.tline)) >= config.policy.holderMin
    : false;

  const unsecured = agent.verified && score ? score.lineUsd : 0;
  const unsecuredLineUsd = r2(unsecured * (holderBoost ? 1 + config.policy.holderBoost : 1));
  const securedLineUsd = r2(collateralUsd * config.policy.collateralLtv);
  const limitUsd = r2(unsecuredLineUsd + securedLineUsd);
  const availableUsd = agent.frozen || t.overdue ? 0 : r6(Math.max(0, limitUsd + t.prepaidUsd - t.outstandingUsd));

  const status: Position['status'] = agent.frozen ? 'frozen'
    : t.overdue ? 'overdue'
    : limitUsd > 0 || t.prepaidUsd > 0 ? 'active'
    : agent.mint && !agent.verified ? 'pending_verification'
    : 'no_line';

  return {
    drawnUsd: r6(t.drawnUsd), repaidUsd: r6(t.repaidUsd), outstandingUsd: r6(t.outstandingUsd), prepaidUsd: r6(t.prepaidUsd),
    collateral, collateralUsd, unsecuredLineUsd, securedLineUsd, holderBoost,
    limitUsd, availableUsd, overdue: t.overdue, status, score,
  };
}
