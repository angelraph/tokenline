// Ledger classification rules for pool and escrow transactions. Dependency-free (addresses are
// passed in), so the live chain sync and the tests run the exact same code.

const LAMPORTS = 1_000_000_000;

export type ChainTx = {
  signature: string;
  timestamp: number;
  feePayer?: string;
  type?: string;
  nativeTransfers?: { fromUserAccount: string; toUserAccount: string; amount: number }[];
  tokenTransfers?: { fromUserAccount: string; toUserAccount: string; tokenAmount: number; mint: string }[];
};

export type Classified = {
  type: 'repay' | 'collateral' | 'collateral_release' | 'deposit' | 'buyback' | 'burn';
  agentId: string | null;
  asset: string;
  amount: number;
  from: string;
  to: string;
};

export type Wallets = { pool: string; escrow: string; usdc: string; collateralMints: string[] };

/**
 * Turn one enhanced transaction into ledger entries for the pool and escrow wallets.
 * - SOL / USDC into the pool from an agent wallet -> repay (surplus becomes prepaid credit)
 * - SOL / USDC into the pool from anyone else     -> deposit (backer liquidity)
 * - $ANSEM / $TOKENL into escrow from an agent    -> collateral
 * - $ANSEM / $TOKENL out of escrow to an agent    -> collateral_release
 * - a transaction the pool itself signed that brings $TOKENL / $ANSEM in -> buyback
 */
export function classify(tx: ChainTx, byWallet: Map<string, { id: string }>, w: Wallets): Classified[] {
  const out: Classified[] = [];
  const { pool, escrow } = w;
  const collateralMints = new Set(w.collateralMints.filter(Boolean));

  // The pool initiated this transaction (a swap or a transfer it signed). Nothing in it can be an
  // incoming repayment or deposit; record tokens it bought back and collateral it returned.
  if (pool && tx.feePayer === pool) {
    const bought = new Map<string, number>();
    for (const t of tx.tokenTransfers ?? []) {
      if (!collateralMints.has(t.mint) || !(t.tokenAmount > 0)) continue;
      const toAgent = byWallet.get(t.toUserAccount);
      if (t.fromUserAccount === escrow && toAgent) {
        out.push({ type: 'collateral_release', agentId: toAgent.id, asset: t.mint, amount: t.tokenAmount, from: escrow, to: t.toUserAccount });
      } else if (t.toUserAccount === pool && t.fromUserAccount !== pool) {
        bought.set(t.mint, (bought.get(t.mint) ?? 0) + t.tokenAmount);
      }
    }
    for (const [mint, amount] of bought) out.push({ type: 'buyback', agentId: null, asset: mint, amount, from: 'market', to: pool });
    return out;
  }

  for (const t of tx.nativeTransfers ?? []) {
    if (t.toUserAccount !== pool || t.fromUserAccount === pool || t.amount <= 0) continue;
    const agent = byWallet.get(t.fromUserAccount);
    out.push({ type: agent ? 'repay' : 'deposit', agentId: agent?.id ?? null, asset: 'SOL', amount: t.amount / LAMPORTS, from: t.fromUserAccount, to: pool });
  }
  for (const t of tx.tokenTransfers ?? []) {
    if (!t.tokenAmount || t.tokenAmount <= 0) continue;
    if (t.mint === w.usdc && t.toUserAccount === pool && t.fromUserAccount !== pool) {
      const agent = byWallet.get(t.fromUserAccount);
      out.push({ type: agent ? 'repay' : 'deposit', agentId: agent?.id ?? null, asset: t.mint, amount: t.tokenAmount, from: t.fromUserAccount, to: pool });
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

/**
 * ClawPump's auto-buyback runs through the token's own ClawPump wallet. A buy is $TOKENL arriving in that
 * wallet in the same transaction as SOL leaving it; a burn is $TOKENL leaving it to nowhere. Plain
 * transfers in (airdrops, gifts) are ignored.
 */
export function classifyAutoBuyback(tx: ChainTx, wallet: string, mint: string, since = 0): Classified[] {
  // Only after auto-buyback was switched on: earlier activity (such as the launch purchase) is not a buyback.
  if (!wallet || !mint || tx.timestamp * 1000 < since) return [];
  const out: Classified[] = [];
  const transfers = (tx.tokenTransfers ?? []).filter((t) => t.mint === mint && t.tokenAmount > 0);
  const bought = transfers.filter((t) => t.toUserAccount === wallet && t.fromUserAccount !== wallet).reduce((s, t) => s + t.tokenAmount, 0);
  const paidSol = (tx.nativeTransfers ?? []).some((t) => t.fromUserAccount === wallet && t.amount > 0)
    || (tx.tokenTransfers ?? []).some((t) => t.fromUserAccount === wallet && t.mint === WSOL && t.tokenAmount > 0);
  if (bought > 0 && paidSol) out.push({ type: 'buyback', agentId: null, asset: mint, amount: bought, from: 'clawpump', to: wallet });
  const burned = transfers.filter((t) => t.fromUserAccount === wallet && !t.toUserAccount).reduce((s, t) => s + t.tokenAmount, 0);
  if (burned > 0) out.push({ type: 'burn', agentId: null, asset: mint, amount: burned, from: wallet, to: 'burn' });
  return out;
}

const WSOL = 'So11111111111111111111111111111111111111112';
