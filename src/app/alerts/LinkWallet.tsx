'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import bs58 from 'bs58';

type Wallet = {
  connect: () => Promise<{ publicKey: { toString(): string } }>;
  signMessage: (m: Uint8Array, enc: 'utf8') => Promise<{ signature: Uint8Array }>;
};

const message = (code: string) => `Tokenline holder alerts\nLink this wallet to my Telegram chat.\ncode: ${code}`;

/** Signs the link message with the visitor's wallet; the server checks the signature and the $TOKENL balance. */
export function LinkWallet({ min }: { min: number }) {
  const code = useSearchParams().get('c') ?? '';
  const [state, setState] = useState<{ busy: boolean; ok?: string; err?: string }>({ busy: false });

  const wallet = (): Wallet | null =>
    typeof window === 'undefined' ? null : ((window as any).phantom?.solana ?? (window as any).solflare ?? (window as any).solana ?? null);

  async function link() {
    setState({ busy: true });
    try {
      const w = wallet();
      if (!w) throw new Error('No Solana wallet found in this browser. Use the "Open in Phantom" button below on mobile.');
      const address = (await w.connect()).publicKey.toString();
      const { signature } = await w.signMessage(new TextEncoder().encode(message(code)), 'utf8');
      const res = await fetch('/api/alerts/link', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, wallet: address, signature: bs58.encode(signature) }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setState({ busy: false, ok: `Linked. Alerts are on for ${Math.floor(j.balance).toLocaleString('en-US')} $TOKENL. Check Telegram.` });
    } catch (e) {
      setState({ busy: false, err: (e as Error).message });
    }
  }

  if (!code) {
    return <div className="callout">Open this page from the link @tokenhqbot sends you after <code>/alerts</code>.</div>;
  }

  const here = typeof window === 'undefined' ? '' : window.location.href;
  const phantom = here ? `https://phantom.app/ul/browse/${encodeURIComponent(here)}?ref=${encodeURIComponent(window.location.origin)}` : '#';

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn primary" disabled={state.busy || !!state.ok} onClick={link}>
          {state.busy ? 'Waiting for wallet...' : 'Connect wallet and sign'}
        </button>
        <a className="btn" href={phantom}>Open in Phantom</a>
      </div>
      <p className="sub" style={{ marginTop: 10 }}>Needs {min.toLocaleString('en-US')} $TOKENL in the wallet you sign with.</p>
      {state.ok && <div className="callout" style={{ marginTop: 12 }}>{state.ok}</div>}
      {state.err && <div className="callout warn" style={{ marginTop: 12 }}>{state.err}</div>}
    </div>
  );
}
