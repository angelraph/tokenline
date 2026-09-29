import { config } from '@/lib/config';
import { store } from '@/lib/store';
import { upstreamMode, usepodModels } from '@/lib/usepod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Model catalog. Token mode mirrors UsePod's live catalog. UsePod's x402 rail has no
 * catalog endpoint, so x402 mode lists the models Tokenline has actually served.
 */
export async function GET() {
  if (upstreamMode() === 'token') {
    const res = await usepodModels();
    if (res.ok) return new Response(res.body, { status: 200, headers: { 'content-type': 'application/json' } });
  }
  const served = new Set<string>([config.usepod.memoModel]);
  for (const e of await store.listEvents({ limit: 2000 })) if (e.type === 'draw' && e.meta?.model) served.add(String(e.meta.model));
  return Response.json({ object: 'list', data: [...served].map((id) => ({ id, object: 'model', owned_by: 'usepod' })) });
}
