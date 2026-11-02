// Reads a wallet's transaction history page by page, newest first. Dependency-free so tests run the same code.

export type PagedTx = { signature: string; timestamp: number };

/**
 * Keeps fetching older pages until it reaches the `until` signature (the last one already processed), a transaction
 * older than `sinceMs`, an empty or short page, or `maxPages`. `complete` is false only when `maxPages` cut it short,
 * so the caller knows older transactions may remain.
 */
export async function readHistory<T extends PagedTx>(
  fetchPage: (before?: string) => Promise<T[]>,
  opts: { until?: string; sinceMs?: number; maxPages?: number; pageSize?: number } = {},
): Promise<{ txs: T[]; complete: boolean }> {
  const { until, sinceMs = 0, maxPages = 20, pageSize = 100 } = opts;
  const txs: T[] = [];
  let before: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const batch = await fetchPage(before);
    for (const tx of batch) {
      if (tx.signature === until || tx.timestamp * 1000 < sinceMs) return { txs, complete: true };
      txs.push(tx);
    }
    if (batch.length < pageSize) return { txs, complete: true };
    before = batch[batch.length - 1].signature;
  }
  return { txs, complete: false };
}
