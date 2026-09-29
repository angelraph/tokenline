import { board } from '@/lib/board';
import { ok, fail } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try { return ok(await board()); } catch (e) { return fail(502, (e as Error).message); }
}
