import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { config } from './config';
import { parseQuote, type Quote } from './x402';

export { parseQuote };

/**
 * UsePod upstream. Two ways to pay, picked by env:
 * - token mode: USEPOD_PROXY_TOKEN, a prepaid UsePod balance (token lives in the path).
 * - x402 mode:  SPENDER_SECRET_KEY, a small hot wallet that pays per request in SOL.
 *   Nothing is prepaid; unused cap is credited back to the wallet by UsePod.
 */
export type UpstreamMode = 'token' | 'x402' | 'none';

export const upstreamMode = (): UpstreamMode =>
  config.usepod.token ? 'token' : config.usepod.spenderSecret ? 'x402' : 'none';

let spender: Keypair | null = null;
export function spenderKeypair(): Keypair {
  if (spender) return spender;
  const raw = config.usepod.spenderSecret.trim();
  // Accept both a base58 secret (Phantom export) and a JSON byte array (solana-keygen).
  const bytes = raw.startsWith('[') ? Uint8Array.from(JSON.parse(raw)) : bs58.decode(raw);
  spender = Keypair.fromSecretKey(bytes);
  return spender;
}

const rpcUrl = () =>
  config.heliusKey ? `https://mainnet.helius-rpc.com/?api-key=${config.heliusKey}` : 'https://api.mainnet-beta.solana.com';

/** Largest single payment the spender will make, in lamports (~$0.12 at $120/SOL). */
const MAX_LAMPORTS_PER_CALL = 1_000_000;

async function payQuote(q: Quote) {
  const sol = q.accepts.find((a) => a.asset === 'SOL');
  if (!sol) throw new UpstreamError(503, 'upstream_rail', 'UsePod did not offer a SOL payment rail');
  if (sol.amount_microunits > MAX_LAMPORTS_PER_CALL) {
    throw new UpstreamError(402, 'quote_too_large', `Quote of ${sol.amount_microunits} lamports exceeds the per-call cap; lower max_tokens`);
  }
  const kp = spenderKeypair();
  const conn = new Connection(rpcUrl(), 'confirmed');
  const tx = new Transaction().add(SystemProgram.transfer({
    fromPubkey: kp.publicKey, toPubkey: new PublicKey(sol.pay_to), lamports: sol.amount_microunits,
  }));
  let signature: string;
  try {
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    tx.feePayer = kp.publicKey;
    tx.sign(kp);
    signature = await conn.sendRawTransaction(tx.serialize());
    await conn.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
  } catch (e) {
    throw new UpstreamError(503, 'pool_at_capacity', `Pool could not pay UsePod right now: ${(e as Error).message}`);
  }
  return {
    header: Buffer.from(JSON.stringify({
      quote_id: q.quote_id, network: sol.network, asset: 'SOL', payer_wallet: kp.publicKey.toBase58(), signature,
    })).toString('base64'),
    signature,
    lamports: sol.amount_microunits,
  };
}

export class UpstreamError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export type UpstreamResult = {
  res: Response;
  /** On-chain payment made for this call, if any (x402 mode). */
  payment: { signature: string; lamports: number } | null;
};

/** POST to a UsePod OpenAI/Anthropic path, paying per request in x402 mode. */
export async function usepodPost(path: string, body: unknown, headers: Record<string, string> = {}): Promise<UpstreamResult> {
  const mode = upstreamMode();
  if (mode === 'none') throw new UpstreamError(503, 'upstream_unconfigured', 'No UsePod route configured');
  const url = mode === 'token'
    ? `${config.usepod.base}/${config.usepod.token}${path}`
    : `${config.usepod.base}/x402${path}`;
  const init = (extra: Record<string, string> = {}): RequestInit => ({
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers, ...extra },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(300_000),
  });

  const first = await fetch(url, init());
  if (mode === 'token' || first.status !== 402) return { res: first, payment: null };

  const quote = parseQuote(first.headers.get('payment-required'));
  if (!quote) return { res: first, payment: null };
  const paid = await payQuote(quote);
  const res = await fetch(url, init({ 'PAYMENT-SIGNATURE': paid.header }));
  return { res, payment: { signature: paid.signature, lamports: paid.lamports } };
}

export async function usepodModels(): Promise<Response> {
  const mode = upstreamMode();
  const url = mode === 'token' ? `${config.usepod.base}/${config.usepod.token}/v1/models` : `${config.usepod.base}/x402/v1/models`;
  return fetch(url, { signal: AbortSignal.timeout(15_000) });
}
