import { z } from 'zod';
import { store } from '@/lib/store';
import { ok, fail, isAdmin } from '@/lib/http';

const Body = z.object({ agentId: z.string().uuid(), action: z.enum(['verify', 'unverify', 'freeze', 'unfreeze']), note: z.string().optional() });

/** Operator actions. Every one is written to the public ledger. */
export async function POST(req: Request) {
  if (!isAdmin(req)) return fail(401, 'admin only');
  const p = Body.safeParse(await req.json().catch(() => ({})));
  if (!p.success) return fail(422, 'invalid', { issues: p.error.issues });
  const { agentId, action, note } = p.data;
  const agent = await store.getAgent(agentId);
  if (!agent) return fail(404, 'no such agent');
  const patch = action === 'verify' ? { verified: true } : action === 'unverify' ? { verified: false }
    : action === 'freeze' ? { frozen: true } : { frozen: false };
  await store.updateAgent(agentId, patch);
  const type = action === 'freeze' ? 'freeze' : action === 'unfreeze' ? 'unfreeze' : 'verify';
  await store.addEvent({ agentId, type, amountUsd: 0, asset: null, amount: null, txSig: null, meta: { action, note: note ?? null } });
  return ok({ agentId, ...patch });
}

export async function GET(req: Request) {
  if (!isAdmin(req)) return fail(401, 'admin only');
  const agents = await store.listAgents();
  return ok({ agents: agents.map(({ keyHash: _k, ...a }) => a) });
}
