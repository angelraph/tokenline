import { poolStats } from '@/lib/board';
import { ok } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  return ok(await poolStats());
}
