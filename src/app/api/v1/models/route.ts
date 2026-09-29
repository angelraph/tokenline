import { upstreamMode, usepodModels } from '@/lib/usepod';

export const runtime = 'nodejs';

/** Mirrors UsePod's live model catalog so SDK model pickers work unchanged. */
export async function GET() {
  if (upstreamMode() === 'none') return Response.json({ object: 'list', data: [] });
  const res = await usepodModels();
  return new Response(res.body, { status: res.status, headers: { 'content-type': 'application/json' } });
}
