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
  type: 'repay' | 'collateral' | 'collateral_release' | 'deposit' | 'buyback';
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
