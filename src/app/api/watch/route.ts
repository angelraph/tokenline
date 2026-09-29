import { board } from '@/lib/board';
import { movers } from '@/lib/watch';
import { ok } from '@/lib/http';

export const dynamic = 'force-dynamic';

/** Credit Watch: score upgrades, downgrades and pulled lines over the last N hours. */
export async function GET(req: Request) {
  const hours = Math.min(168, Math.max(1, Number(new URL(req.url).searchParams.get('hours')) || 24));
  const { rows } = await board();
  return ok({ hours, ...(await movers(rows, hours)) });
}
