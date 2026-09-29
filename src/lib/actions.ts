import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { config } from './config';

// Solana Actions (Blinks) helpers. Spec: GET describes the action, POST {account}
// returns an unsigned transaction the user's wallet signs.

export const MAINNET = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

export const ACTION_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, PUT, OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization, Content-Encoding, Accept-Encoding, X-Accept-Action-Version, X-Accept-Blockchain-Ids',
  'access-control-expose-headers': 'X-Action-Version, X-Blockchain-Ids',
  'x-action-version': '2.4',
  'x-blockchain-ids': MAINNET,
  'content-type': 'application/json',
};

export const actionJson = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: ACTION_HEADERS });
export const actionError = (message: string, status = 400) => actionJson({ message }, status);
export const actionOptions = () => new Response(null, { status: 204, headers: ACTION_HEADERS });

export const icon = () => `${config.baseUrl}/logo.png`;

export const rpc = () => new Connection(
  config.heliusKey ? `https://mainnet.helius-rpc.com/?api-key=${config.heliusKey}` : 'https://api.mainnet-beta.solana.com',
  'confirmed',
);

/** Parse the POST body's `account` into a public key, or null. */
export async function accountOf(req: Request): Promise<PublicKey | null> {
  try {
    const { account } = (await req.json()) as { account?: string };
    return account ? new PublicKey(account) : null;
  } catch {
    return null;
  }
}

/** Finish an unsigned transaction for the payer and serialize it for the wallet. */
export async function serialize(tx: Transaction, payer: PublicKey) {
  const { blockhash, lastValidBlockHeight } = await rpc().getLatestBlockhash('confirmed');
  tx.feePayer = payer;
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64');
}

/** Read a positive number query parameter within bounds. */
export function amountParam(req: Request, name: string, min: number, max: number): number | null {
  const v = Number(new URL(req.url).searchParams.get(name));
  return Number.isFinite(v) && v >= min && v <= max ? v : null;
}
