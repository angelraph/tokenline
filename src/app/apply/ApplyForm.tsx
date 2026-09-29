'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import bs58 from 'bs58';

type Phantom = {
  isPhantom?: boolean;
  connect: () => Promise<{ publicKey: { toString(): string } }>;
  signMessage: (m: Uint8Array, enc: 'utf8') => Promise<{ signature: Uint8Array }>;
};

type Result = { agentId: string; apiKey: string; verification: { code: string; instructions: string } | null };

export function ApplyForm() {
  const sp = useSearchParams();
  const [name, setName] = useState('');
  const [mint, setMint] = useState(sp.get('mint') ?? '');
  const [wallet, setWallet] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [manual, setManual] = useState<{ message: string; signature: string } | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const provider = (): Phantom | null =>
    typeof window === 'undefined' ? null : ((window as any).phantom?.solana ?? (window as any).solana ?? null);

  async function submit(w: string, message: string, signature: string) {
    const res = await fetch('/api/apply', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ wallet: w, message, signature, name, mint: mint.trim() }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error + (j.issues ? `: ${j.issues.map((i: any) => i.message).join(', ')}` : ''));
    setResult(j);
  }

  async function withWallet() {
    setError(''); setBusy(true);
    try {
      const p = provider();
      if (!p) throw new Error('No Solana wallet found. Install Phantom, or use the manual signing option below.');
      const w = (await p.connect()).publicKey.toString();
      setWallet(w);
      const { message } = await (await fetch(`/api/apply/message?wallet=${w}`)).json();
      const { signature } = await p.signMessage(new TextEncoder().encode(message), 'utf8');
      await submit(w, message, bs58.encode(signature));
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(false); }
  }

  async function startManual() {
    setError('');
    const r = await fetch(`/api/apply/message?wallet=${wallet.trim()}`);
    const j = await r.json();
    if (!r.ok) return setError(j.error);
    setManual({ message: j.message, signature: '' });
  }

  if (result) {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <div className="callout">
          <strong>Your line is open.</strong> This API key is shown once. Store it in your agent&apos;s secrets now.
        </div>
        <pre className="code">{result.apiKey}</pre>
        {result.verification && (
          <div className="card">
            <h3>Unlock your unsecured line</h3>
            <p className="muted" style={{ marginTop: 0 }}>{result.verification.instructions}</p>
            <a className="btn" target="_blank" rel="noreferrer"
              href={`https://x.com/intent/post?text=${encodeURIComponent(`Tokenline verify ${result.verification.code}. Our agent just opened a compute credit line on @tokenlinehq, underwritten by its on-chain fees. #AnsemHack`)}`}>
              Post verification on X ↗
            </a>
          </div>
        )}
        <div className="card">
          <h3>Point your agent at it</h3>
          <pre className="code">{`from openai import OpenAI
client = OpenAI(base_url="${base}/v1", api_key="${result.apiKey.slice(0, 12)}…")
client.chat.completions.create(model="deepseek-v4-1-flash", messages=[...])`}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="field">
        <label>Agent name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Shinjuku StAItion" />
      </div>
      <div className="field">
        <label>Clawrena token mint (optional; leave blank for a collateral-only line)</label>
        <input className="input mono" value={mint} onChange={(e) => setMint(e.target.value)} placeholder="Mint address of your tokenized entry" />
      </div>
      <button className="btn primary" disabled={busy || !name} onClick={withWallet}>
        {busy ? 'Waiting for wallet…' : 'Connect wallet & sign'}
      </button>

      <details style={{ marginTop: 18 }}>
        <summary className="muted" style={{ cursor: 'pointer' }}>Agent wallet without a browser extension? Sign manually</summary>
        <div style={{ marginTop: 12 }}>
          <div className="field">
            <label>Agent wallet address</label>
            <input className="input mono" value={wallet} onChange={(e) => setWallet(e.target.value)} />
          </div>
          {!manual ? (
            <button className="btn" disabled={!wallet || !name} onClick={startManual}>Get message to sign</button>
          ) : (
            <>
              <pre className="code">{manual.message}</pre>
              <div className="field" style={{ marginTop: 12 }}>
                <label>Base58 ed25519 signature of the exact message above</label>
                <input className="input mono" value={manual.signature} onChange={(e) => setManual({ ...manual, signature: e.target.value })} />
              </div>
              <button className="btn primary" disabled={!manual.signature || busy} onClick={async () => {
                setBusy(true); setError('');
                try { await submit(wallet.trim(), manual.message, manual.signature.trim()); } catch (e) { setError((e as Error).message); }
                finally { setBusy(false); }
              }}>Submit application</button>
            </>
          )}
        </div>
      </details>
      {error && <div className="callout warn" style={{ marginTop: 14 }}>{error}</div>}
    </div>
  );
}
