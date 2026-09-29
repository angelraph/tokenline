/** The on-chain signature behind a ledger event, if it has one. */
export function txOf(e: { txSig: string | null; meta: Record<string, unknown> | null }): string | null {
  const m = e.meta ?? {};
  const sig = (m.x402Signature as string) || (m.signature as string) || e.txSig?.split(':')[0] || null;
  return sig && sig.length >= 64 ? sig : null;
}

/** Shortened transaction hash that opens on Solscan. */
export function TxLink({ sig }: { sig: string | null }) {
  if (!sig) return <span className="sub">off-chain</span>;
  return (
    <a className="tx mono" href={`https://solscan.io/tx/${sig}`} target="_blank" rel="noreferrer" title={sig}>
      {sig.slice(0, 5)}…{sig.slice(-5)} ↗
    </a>
  );
}
