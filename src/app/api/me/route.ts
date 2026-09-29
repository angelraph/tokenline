import { position } from '@/lib/account';
import { config } from '@/lib/config';
import { bearer, hashKey } from '@/lib/keys';
import { store } from '@/lib/store';
import { solUsd } from '@/lib/prices';
import { ok, fail } from '@/lib/http';

export const dynamic = 'force-dynamic';

/** An agent's own credit status. Used by the MCP tool tl_check_credit. */
export async function GET(req: Request) {
  const key = bearer(req);
  const agent = key ? await store.getAgentByKeyHash(hashKey(key)) : null;
  if (!agent) return fail(401, 'Send your Tokenline key as "Authorization: Bearer tl_..."');
  const [pos, events, sol] = await Promise.all([position(agent), store.listEvents({ agentId: agent.id, limit: 20 }), solUsd()]);
  const all = await store.listEvents({ agentId: agent.id, limit: 100_000 });
  const byModel = new Map<string, { calls: number; tokens: number; usd: number }>();
  for (const e of all) {
    if (e.type !== 'draw') continue;
    const m = String(e.meta?.model ?? 'unknown');
    const cur = byModel.get(m) ?? { calls: 0, tokens: 0, usd: 0 };
    cur.calls++; cur.usd += e.amountUsd;
    cur.tokens += Number(e.meta?.inputTokens ?? 0) + Number(e.meta?.outputTokens ?? 0);
    byModel.set(m, cur);
  }
  const spendByModel = [...byModel.entries()].map(([model, v]) => ({ model, ...v, usd: Math.round(v.usd * 1e6) / 1e6 }))
    .sort((a, b) => b.usd - a.usd);
  const { keyHash: _h, ...pub } = agent;
  return ok({
    agent: pub,
    position: pos,
    repay: {
      to: config.poolWallet, assets: ['SOL', 'USDC'], solPriceUsd: sol,
      amountSol: sol ? Math.ceil((pos.outstandingUsd / sol) * 1e6) / 1e6 : null,
      note: 'Send from your registered wallet; credited automatically.',
    },
    collateral: { to: config.escrowWallet, assets: ['ANSEM', ...(config.mints.tline ? ['TLINE'] : [])], ltv: config.policy.collateralLtv },
    spendByModel,
    recent: events,
  });
}
