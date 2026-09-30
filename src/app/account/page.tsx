'use client';

import { useEffect, useState } from 'react';
import { TxLink, txOf } from '../TxLink';

type Me = {
  agent: { id: string; name: string; wallet: string; mint: string | null; verified: boolean; frozen: boolean; keyPrefix: string };
  position: {
    drawnUsd: number; repaidUsd: number; outstandingUsd: number; prepaidUsd: number; collateralUsd: number;
    unsecuredLineUsd: number; securedLineUsd: number; holderBoost: boolean; limitUsd: number; availableUsd: number;
    status: string; collateral: { asset: string; amount: number; usd: number }[];
    score: { score: number; grade: string } | null;
  };
  repay: { to: string };
  collateral: { to: string; ltv: number };
  spendByModel: { model: string; calls: number; tokens: number; usd: number }[];
  recent: { id: string; type: string; amountUsd: number; at: string; meta: any; txSig: string | null }[];
};

const KEY = 'tokenline.key';

export default function Account() {
  const [key, setKey] = useState('');
  const [me, setMe] = useState<Me | null>(null);
  const [err, setErr] = useState('');
  const [prompt, setPrompt] = useState('In one sentence, why should AI agents have credit scores?');
  const [reply, setReply] = useState<{ text: string; charged: string; tx: string | null } | null>(null);
  const [thinking, setThinking] = useState(false);

  async function tryIt() {
    setThinking(true); setReply(null);
    try {
      const r = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'deepseek-v4-1-flash', max_tokens: 400, messages: [{ role: 'user', content: prompt }] }),
      });
      const j = await r.json();
      if (!r.ok) setReply({ text: j.error?.message ?? 'Request failed', charged: '0', tx: null });
      else setReply({ text: j.choices?.[0]?.message?.content ?? '', charged: r.headers.get('x-tokenline-charged-usd') ?? '0', tx: r.headers.get('x-tokenline-payment-tx') });
      load(key);
    } finally { setThinking(false); }
  }

  async function load(k: string) {
    setErr('');
    const r = await fetch('/api/me', { headers: { authorization: `Bearer ${k}` } });
    const j = await r.json();
    if (!r.ok) { setMe(null); return setErr(j.error); }
    setMe(j);
    try { sessionStorage.setItem(KEY, k); } catch { /* storage blocked */ }
  }

  useEffect(() => {
    try { const k = sessionStorage.getItem(KEY); if (k) { setKey(k); load(k); } } catch { /* storage blocked */ }
  }, []);

  const p = me?.position;
  return (
    <main className="wrap" style={{ maxWidth: 980 }}>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="eyebrow">My line</div>
        <h1 style={{ fontSize: 40 }}>{me ? me.agent.name : 'Check your credit line'}</h1>
      </section>

      {!me && (
        <div className="card" style={{ maxWidth: 560 }}>
          <div className="field">
            <label>Tokenline API key</label>
            <input className="input mono" type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="tl_…" />
          </div>
          <button className="btn primary" disabled={!key} onClick={() => load(key)}>Load</button>
          {err && <div className="callout warn" style={{ marginTop: 14 }}>{err}</div>}
        </div>
      )}

      {me && p && (
        <>
          <div className="stats">
            <div className="stat"><div className="k">Available</div><div className="v" style={{ color: 'var(--accent)' }}>${p.availableUsd.toFixed(p.availableUsd < 1 ? 4 : 2)}</div></div>
            <div className="stat"><div className="k">Limit</div><div className="v">${p.limitUsd.toFixed(2)}</div></div>
            <div className="stat"><div className="k">Outstanding</div><div className="v">${p.outstandingUsd.toFixed(4)}</div></div>
            <div className="stat"><div className="k">Prepaid</div><div className="v">${p.prepaidUsd.toFixed(p.prepaidUsd < 1 ? 4 : 2)}</div></div>
            <div className="stat"><div className="k">Status</div><div className="v" style={{ fontSize: 16 }}>{p.status.replace('_', ' ')}</div></div>
          </div>

          <div className="grid3">
            <div className="card">
              <h3>Unsecured</h3>
              <div className="mono" style={{ fontSize: 22 }}>${p.unsecuredLineUsd.toFixed(2)}</div>
              <p className="sub">{p.score ? `Grade ${p.score.grade} · ${p.score.score}/1000` : 'No Clawrena mint linked'}{p.holderBoost ? ' · $TOKENL holder boost' : ''}
                {me.agent.mint && !me.agent.verified ? ' · waiting for X verification' : ''}</p>
            </div>
            <div className="card">
              <h3>Collateral</h3>
              <div className="mono" style={{ fontSize: 22 }}>${p.collateralUsd.toFixed(2)} → ${p.securedLineUsd.toFixed(2)}</div>
              <p className="sub">Send $ANSEM from {me.agent.wallet.slice(0, 4)}…{me.agent.wallet.slice(-4)} to<br /><span className="mono">{me.collateral.to || 'escrow not configured'}</span></p>
            </div>
            <div className="card">
              <h3>Repay</h3>
              <div className="mono" style={{ fontSize: 22 }}>${p.outstandingUsd.toFixed(4)}</div>
              <p className="sub">Send SOL or USDC from your agent wallet to<br /><span className="mono">{me.repay.to || 'pool not configured'}</span></p>
            </div>
          </div>

          <div className="section">
            <div className="section-head"><div><h2>Think on credit</h2><p>Runs a real call on UsePod, paid by the pool and booked to your line.</p></div></div>
            <div className="card">
              <textarea className="input" rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
                <button className="btn primary" disabled={thinking || !prompt.trim() || p.availableUsd <= 0} onClick={tryIt}>
                  {thinking ? 'Thinking…' : 'Run on credit'}
                </button>
                <span className="sub">{p.availableUsd > 0 ? `${p.availableUsd.toFixed(4)} available` : 'No credit available yet'}</span>
              </div>
              {reply && (
                <div className="callout" style={{ marginTop: 14 }}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{reply.text}</div>
                  <div className="sub" style={{ marginTop: 8 }}>Charged ${Number(reply.charged).toFixed(6)} to this line.{reply.tx && <> UsePod payment: <TxLink sig={reply.tx} /></>}</div>
                </div>
              )}
            </div>
          </div>

          {me.spendByModel.length > 0 && (
            <div className="section">
              <div className="section-head"><div><h2>Where your compute goes</h2><p>Every call on this line, by model.</p></div></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Model</th><th className="num">Calls</th><th className="num hide-sm">Tokens</th><th className="num">Spend</th></tr></thead>
                  <tbody>
                    {me.spendByModel.map((m) => (
                      <tr key={m.model}><td className="mono">{m.model}</td><td className="num">{m.calls}</td>
                        <td className="num hide-sm">{m.tokens.toLocaleString()}</td><td className="num">${m.usd.toFixed(4)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="section">
            <div className="section-head"><h2>Recent activity</h2><button className="btn" onClick={() => load(key)}>Refresh</button></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>When</th><th>Type</th><th className="hide-sm">Detail</th><th><span className="hide-sm">Transaction</span><span className="show-sm">Tx</span></th><th className="num">USD</th></tr></thead>
                <tbody>
                  {me.recent.map((e) => (
                    <tr key={e.id}>
                      <td className="sub when"><span>{new Date(e.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span> <span>{new Date(e.at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span></td>
                      <td>{e.type}</td>
                      <td className="sub hide-sm">
                        {e.type === 'draw' ? `${e.meta?.model} · ${e.meta?.inputTokens}+${e.meta?.outputTokens} tokens`
                          : e.meta?.from ? `from ${String(e.meta.from).slice(0, 4)}…${String(e.meta.from).slice(-4)}` : ''}
                      </td>
                      <td><TxLink sig={txOf(e)} /></td>
                      <td className="num">{e.amountUsd ? `$${e.amountUsd.toFixed(e.type === 'draw' ? 5 : 2)}` : 'n/a'}</td>
                    </tr>
                  ))}
                  {!me.recent.length && <tr><td colSpan={5} className="sub">No activity yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
