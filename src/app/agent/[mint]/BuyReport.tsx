'use client';

import { useState } from 'react';
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { TxLink } from '../../TxLink';

type Phantom = {
  connect: () => Promise<{ publicKey: { toString(): string } }>;
  signAndSendTransaction: (tx: Transaction) => Promise<{ signature: string }>;
};
type Quote = { quote_id: string; accepts: { asset: string; network: string; pay_to: string; amount_microunits: number }[] };
type Report = { grade: string; score: number; verdict: string; reason: string; preApprovedLineUsd: number; receipt: { signature: string; lamports: number } };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Buy the paid x402 credit report from the browser: Phantom pays the pool, the server verifies on-chain. */
export function BuyReport({ mint, priceUsd }: { mint: string; priceUsd: number }) {
  const [step, setStep] = useState<'idle' | 'quote' | 'sign' | 'verify' | 'done'>('idle');
  const [error, setError] = useState('');
  const [report, setReport] = useState<Report | null>(null);

  async function buy() {
    setError(''); setReport(null);
    const phantom: Phantom | null = (window as any).phantom?.solana ?? (window as any).solana ?? null;
    if (!phantom) return setError('No Solana wallet found. Install Phantom to buy a report from the browser.');
    try {
      setStep('quote');
      const q = await fetch(`/api/x402/report/${mint}`, { cache: 'no-store' });
      const qj = await q.json();
      if (q.status !== 402 || !qj.quote) throw new Error(qj.error ?? 'Could not get a quote');
      const quote = qj.quote as Quote;
      const memo = String(qj.memo ?? '');
      const sol = quote.accepts.find((a) => a.asset === 'SOL');
      if (!sol) throw new Error('No SOL payment option offered');

      setStep('sign');
      const payer = (await phantom.connect()).publicKey.toString();
      const bh = await (await fetch('/api/chain/blockhash', { cache: 'no-store' })).json();
      if (!bh.blockhash) throw new Error(bh.error ?? 'Network busy, try again');
      const tx = new Transaction({ feePayer: new PublicKey(payer), blockhash: bh.blockhash, lastValidBlockHeight: bh.lastValidBlockHeight })
        .add(SystemProgram.transfer({ fromPubkey: new PublicKey(payer), toPubkey: new PublicKey(sol.pay_to), lamports: sol.amount_microunits }))
        .add(new TransactionInstruction({ keys: [], programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'), data: Buffer.from(memo, 'utf8') }));
      const { signature } = await phantom.signAndSendTransaction(tx);

      setStep('verify');
      const header = btoa(JSON.stringify({ quote_id: quote.quote_id, network: sol.network, asset: 'SOL', payer_wallet: payer, signature }));
      // The payment needs a few seconds to confirm before the server can verify it.
      for (let i = 0; i < 12; i++) {
        await sleep(i === 0 ? 2500 : 2500);
        const r = await fetch(`/api/x402/report/${mint}`, { headers: { 'PAYMENT-SIGNATURE': header }, cache: 'no-store' });
        const j = await r.json();
        if (r.ok) { setReport(j); setStep('done'); return; }
        if (!/not found|failed/i.test(j.reason ?? '')) throw new Error(j.reason ?? j.error ?? 'Payment rejected');
      }
      throw new Error('Payment is still confirming. Check the ledger in a minute.');
    } catch (e) {
      setError((e as Error).message);
      setStep('idle');
    }
  }

  const label = { idle: `Buy verified report · $${priceUsd.toFixed(2)} in SOL`, quote: 'Getting quote…', sign: 'Approve in your wallet…', verify: 'Verifying on-chain…', done: 'Buy another' }[step];

  return (
    <div>
      <p className="muted" style={{ marginTop: 0, lineHeight: 1.6, fontSize: 14 }}>
        The machine readable report other agents buy over x402. Paying from your wallet sends SOL to the lending pool and
        the receipt is checked on-chain.
      </p>
      <button className="btn blue" disabled={step !== 'idle' && step !== 'done'} onClick={buy}>{label}</button>
      {error && <div className="callout warn" style={{ marginTop: 12 }}>{error}</div>}
      {report && (
        <div className="callout" style={{ marginTop: 12 }}>
          <div><strong>{report.grade}</strong> · {report.score}/1000 · verdict <strong>{report.verdict}</strong></div>
          <div className="sub" style={{ marginTop: 4 }}>{report.reason}</div>
          <div className="sub" style={{ marginTop: 6 }}>Paid {(report.receipt.lamports / 1e9).toFixed(6)} SOL · receipt <TxLink sig={report.receipt.signature} /></div>
        </div>
      )}
    </div>
  );
}
