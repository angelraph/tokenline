import { Connection } from '@solana/web3.js';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

/** Latest blockhash for browser-built transactions, fetched through our RPC so no key reaches the client. */
export async function GET() {
  const url = config.heliusKey ? `https://mainnet.helius-rpc.com/?api-key=${config.heliusKey}` : 'https://api.mainnet-beta.solana.com';
  try {
    const { blockhash, lastValidBlockHeight } = await new Connection(url, 'confirmed').getLatestBlockhash('confirmed');
    return Response.json({ blockhash, lastValidBlockHeight });
  } catch {
    return Response.json({ error: 'RPC unavailable, retry in a moment' }, { status: 503 });
  }
}
