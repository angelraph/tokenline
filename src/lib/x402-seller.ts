import { createHmac, timingSafeEqual } from 'node:crypto';
import { Connection } from '@solana/web3.js';
import { config } from './config';
import { solUsd } from './prices';
import { store } from './store';

// Tokenline sells machine-readable credit reports over x402, in the same wire
// format UsePod uses, so any x402 agent can buy one without an account.

export const NETWORK = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const QUOTE_TTL_MS = 10 * 60_000;

const sign = (payload: string) => createHmac('sha256', config.quoteSecret).update(payload).digest('base64url');

/** quote_id = base64url(resource|lamports|expiry).hmac, so quotes need no storage. */
export async function makeQuote(resource: string) {
  const sol = await solUsd();
  if (!sol) throw new Error('SOL price unavailable');
  const lamports = Math.ceil((config.reportPriceUsd / sol) * 1e9);
  const payload = Buffer.from(`${resource}|${lamports}|${Date.now() + QUOTE_TTL_MS}`).toString('base64url');
  const quote = {
    x402_version: 2,
    quote_id: `${payload}.${sign(payload)}`,
    accepts: [{ asset: 'SOL', scheme: 'exact', network: NETWORK, pay_to: config.poolWallet, amount_microunits: lamports }],
  };
  return { quote, header: Buffer.from(JSON.stringify(quote)).toString('base64') };
}

function openQuote(quoteId: string, resource: string) {
  const [payload, mac] = quoteId.split('.');
  if (!payload || !mac) return null;
  const expect = Buffer.from(sign(payload));
  const got = Buffer.from(mac);
  if (expect.length !== got.length || !timingSafeEqual(expect, got)) return null;
  const [res, lamports, exp] = Buffer.from(payload, 'base64url').toString().split('|');
  if (res !== resource || Date.now() > Number(exp)) return null;
  return { lamports: Number(lamports), issuedAt: Number(exp) - QUOTE_TTL_MS };
}

const rpcUrl = () =>
  config.heliusKey ? `https://mainnet.helius-rpc.com/?api-key=${config.heliusKey}` : 'https://api.mainnet-beta.solana.com';

export type Settlement = { ok: true; payer: string; signature: string; lamports: number } | { ok: false; reason: string };

/** Verify a PAYMENT-SIGNATURE header against the chain and burn the signature. */
export async function settle(header: string, resource: string): Promise<Settlement> {
  let p: { quote_id?: string; payer_wallet?: string; signature?: string; asset?: string };
  try { p = JSON.parse(Buffer.from(header, 'base64').toString('utf8')); } catch { return { ok: false, reason: 'malformed PAYMENT-SIGNATURE' }; }
  if (!p.quote_id || !p.signature || !p.payer_wallet) return { ok: false, reason: 'quote_id, payer_wallet and signature are required' };
  const q = openQuote(p.quote_id, resource);
  if (!q) return { ok: false, reason: 'quote is invalid, expired or for another resource' };

  const conn = new Connection(rpcUrl(), 'confirmed');
  const tx = await conn.getParsedTransaction(p.signature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 }).catch(() => null);
  if (!tx || tx.meta?.err) return { ok: false, reason: 'payment transaction not found or failed' };
  // The payment must come after the quote, so old transfers can't be replayed as payment.
  if (!tx.blockTime || tx.blockTime * 1000 < q.issuedAt - 60_000) return { ok: false, reason: 'payment predates the quote' };
  const paid = tx.transaction.message.instructions.some((ix) => {
    if (!('parsed' in ix) || ix.program !== 'system' || ix.parsed?.type !== 'transfer') return false;
    const info = ix.parsed.info as { source: string; destination: string; lamports: number };
    return info.source === p.payer_wallet && info.destination === config.poolWallet && info.lamports >= q.lamports;
  });
  if (!paid) return { ok: false, reason: 'transaction does not pay the quoted amount to the pool' };

  // If the chain sync saw this transfer first it was booked as a deposit/repay; rebook it as a sale.
  for (const e of await store.eventsForSignature(p.signature)) {
    if (e.type === 'sale') return { ok: false, reason: 'payment already used' };
    // A transfer already credited to an agent's line stays a repayment; never re-purpose it.
    if (e.type !== 'deposit') return { ok: false, reason: 'transaction was already credited as a repayment' };
    await store.deleteEvent(e.id);
  }
  // One payment buys one report: the signature is burned in the ledger.
  const fresh = await store.addEvent({
    agentId: null, type: 'sale', amountUsd: (q.lamports / 1e9) * (await solUsd()), asset: 'SOL', amount: q.lamports / 1e9,
    txSig: p.signature, meta: { signature: p.signature, from: p.payer_wallet, product: 'credit_report', resource },
  });
  if (!fresh) return { ok: false, reason: 'payment already used' };
  return { ok: true, payer: p.payer_wallet, signature: p.signature, lamports: q.lamports };
}
