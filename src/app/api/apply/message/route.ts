import { applyMessage, isSolanaAddress } from '@/lib/keys';
import { ok, fail } from '@/lib/http';

export async function GET(req: Request) {
  const wallet = new URL(req.url).searchParams.get('wallet') ?? '';
  if (!isSolanaAddress(wallet)) return fail(400, 'wallet must be a Solana address');
  return ok({ message: applyMessage(wallet, new Date().toISOString()) });
}
