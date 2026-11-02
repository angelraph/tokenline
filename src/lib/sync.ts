import { config } from './config';
import { addressTransactions, type EnhancedTx } from './helius';
import { assetUsd } from './prices';
import { store } from './store';
import { classify, classifyAutoBuyback } from './classify';
import { readHistory } from './paging';

const DUST_USD = 0.001;

const wallets = () => ({
  pool: config.poolWallet, escrow: config.escrowWallet, usdc: config.mints.usdc,
  collateralMints: [config.mints.ansem, config.mints.tline],
});

export async function ingest(txs: EnhancedTx[]) {
  const agents = await store.listAgents();
  const byWallet = new Map(agents.map((a) => [a.wallet, a]));
  let added = 0;
  for (const tx of txs) {
    // Report purchases are booked as sales at checkout; don't count them twice.
    if ((await store.eventsForSignature(tx.signature)).some((e) => e.type === 'sale')) continue;
    for (const c of [...classify(tx, byWallet, wallets()), ...config.autoBuybackWallets.flatMap((w) => classifyAutoBuyback(tx, w, config.mints.tline, config.autoBuybackSince))]) {
      const px = await assetUsd(c.asset);
      const usd = c.amount * px;
      if (usd < DUST_USD && !['collateral', 'collateral_release', 'buyback', 'burn'].includes(c.type)) continue;
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

/**
 * Pull every new transaction for the watched wallets since the last cursor. The cursor only moves after the
 * transactions are saved and the whole gap was read, so a failure or a long outage can never skip any.
 * `backfill` ignores the cursor on the auto-buyback wallets and re-reads them from the day auto-buyback began;
 * entries are unique per transaction, so nothing is counted twice.
 */
export async function syncOnchain(opts: { backfill?: boolean } = {}) {
  const auto = new Set(config.autoBuybackWallets);
  const addrs = [...new Set([config.poolWallet, config.escrowWallet, ...config.autoBuybackWallets].filter(Boolean))];
  if (!addrs.length) return { added: 0, note: 'POOL_WALLET not configured' };
  let added = 0;
  let scanned = 0;
  let incomplete = false;
  for (const addr of addrs) {
    const cursorKey = `cursor:${addr}`;
    const rewind = !!opts.backfill && auto.has(addr);
    const until = rewind ? undefined : (await store.getKv<string>(cursorKey)) ?? undefined;
    const { txs, complete } = await readHistory<EnhancedTx>(
      (before) => addressTransactions(addr, until, before),
      { until, sinceMs: auto.has(addr) && !until ? config.autoBuybackSince : 0 },
    );
    scanned += txs.length;
    // Oldest first, so an interruption leaves only newer transactions to redo.
    added += await ingest([...txs].reverse());
    if (txs.length && complete) await store.setKv(cursorKey, txs[0].signature);
    if (!complete) incomplete = true;
  }
  await store.setKv('lastSyncAt', new Date().toISOString());
  return { added, scanned, incomplete };
}
