import { scoreForMint } from '@/lib/account';
import { creditMemo } from '@/lib/memo';
import { ok, fail } from '@/lib/http';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  const r = await scoreForMint(mint);
  if (!r) return fail(404, 'Mint is not a tokenized Clawrena entry', { mint });
  const onLine = (await store.listAgents()).some((a) => a.mint === mint);
  const memo = await creditMemo(r.project, r.score, { llm: onLine });
  return ok({ project: r.project, ...r.score, memo });
}
