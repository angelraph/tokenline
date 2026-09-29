import { store } from '@/lib/store';
import { ok } from '@/lib/http';

export const dynamic = 'force-dynamic';

/** Public, append-only ledger of every draw, repayment, collateral move and deposit. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const limit = Math.min(500, Number(u.searchParams.get('limit')) || 100);
  const agentId = u.searchParams.get('agent') ?? undefined;
  const [events, agents] = await Promise.all([store.listEvents({ agentId, limit }), store.listAgents()]);
  const names = new Map(agents.map((a) => [a.id, a.name]));
  return ok({ events: events.map((e) => ({ ...e, agent: e.agentId ? names.get(e.agentId) ?? null : null })) });
}
