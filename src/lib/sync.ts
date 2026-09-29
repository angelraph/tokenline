import { config } from './config';
import { addressTransactions, type EnhancedTx } from './helius';
import { assetUsd } from './prices';
import { store, type Agent } from './store';

const LAMPORTS = 1_000_000_000;
const DUST_USD = 0.001;

type Classified = {
  type: 'repay' | 'collateral' | 'collateral_release' | 'deposit';
  agentId: string | null;
  asset: string;
  amount: number;
  from: string;
  to: string;
};

/**
 * Turn one enhanced transaction into ledger entries for the pool and escrow wallets.
 * - SOL / USDC into the pool from an agent wallet -> repay (surplus becomes prepaid credit)
 * - SOL / USDC into the pool from anyone else     -> deposit (backer liquidity)
 * - $ANSEM / $TOKENL into escrow from an agent      -> collateral
 * - $ANSEM / $TOKENL out of escrow to an agent      -> collateral_release
 */
export function classify(tx: EnhancedTx, byWallet: Map<string, Agent>): Classified[] {
  const out: Classified[] = [];
  const pool = config.poolWallet, escrow = config.escrowWallet;
  const collateralMints = new Set([config.mints.ansem, config.mints.tline].filter(Boolean));

  for (const t of tx.nativeTransfers ?? []) {
    if (t.toUserAccount !== pool || t.fromUserAccount === pool || t.amount <= 0) continue;
    const agent = byWallet.get(t.fromUserAccount);
    out.push({ type: agent ? 'repay' : 'deposit', agentId: agent?.id ?? null, asset: 'SOL',
      amount: t.amount / LAMPORTS, from: t.fromUserAccount, to: pool });
  }
  for (const t of tx.tokenTransfers ?? []) {
    if (!t.tokenAmount || t.tokenAmount <= 0) continue;
    if (t.mint === config.mints.usdc && t.toUserAccount === pool && t.fromUserAccount !== pool) {
      const agent = byWallet.get(t.fromUserAccount);
      out.push({ type: agent ? 'repay' : 'deposit', agentId: agent?.id ?? null, asset: t.mint,
        amount: t.tokenAmount, from: t.fromUserAccount, to: pool });
    } else if (collateralMints.has(t.mint)) {
      const inAgent = byWallet.get(t.fromUserAccount);
      const outAgent = byWallet.get(t.toUserAccount);
      if (t.toUserAccount === escrow && inAgent) {
        out.push({ type: 'collateral', agentId: inAgent.id, asset: t.mint, amount: t.tokenAmount, from: t.fromUserAccount, to: escrow });
      } else if (t.fromUserAccount === escrow && outAgent) {
        out.push({ type: 'collateral_release', agentId: outAgent.id, asset: t.mint, amount: t.tokenAmount, from: escrow, to: t.toUserAccount });
      }
    }
  }
  return out;
}

export async function ingest(txs: EnhancedTx[]) {
  const agents = await store.listAgents();
  const byWallet = new Map(agents.map((a) => [a.wallet, a]));
  let added = 0;
  for (const tx of txs) {
    // Report purchases are booked as sales at checkout; don't count them twice.
    if ((await store.eventsForSignature(tx.signature)).some((e) => e.type === 'sale')) continue;
    for (const c of classify(tx, byWallet)) {
      const px = await assetUsd(c.asset);
      const usd = c.amount * px;
      if (usd < DUST_USD && c.type !== 'collateral' && c.type !== 'collateral_release') continue;
      const ok = await store.addEvent({
        agentId: c.agentId, type: c.type, amountUsd: usd, asset: c.asset, amount: c.amount,
        // One tx can hold several transfers; suffix keeps each one unique yet idempotent.
        txSig: `${tx.signature}:${c.type}:${c.asset}:${c.from}`,
        meta: { signature: tx.signature, from: c.from, to: c.to, priceUsd: px },
        at: new Date(tx.timestamp * 1000).toISOString(),
      });
      if (ok) added++;
    }
  }
  return added;
}

/** Pull new transactions for the pool and escrow wallets since the last cursor. */
export async function syncOnchain() {
  const addrs = [...new Set([config.poolWallet, config.escrowWallet].filter(Boolean))];
  if (!addrs.length) return { added: 0, note: 'POOL_WALLET not configured' };
  let added = 0;
  for (const addr of addrs) {
    const cursorKey = `cursor:${addr}`;
    const until = (await store.getKv<string>(cursorKey)) ?? undefined;
    const txs = await addressTransactions(addr, until);
    if (txs.length) await store.setKv(cursorKey, txs[0].signature);
    added += await ingest(txs);
  }
  await store.setKv('lastSyncAt', new Date().toISOString());
  return { added };
}
