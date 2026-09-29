'use client';

import { useEffect, useState } from 'react';

type A = { id: string; name: string; wallet: string; mint: string | null; xHandle: string | null; verified: boolean; frozen: boolean; createdAt: string };

const TOKEN = 'tokenline.admin';

async function sha6(id: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(id));
  return 'TLINE-' + [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 6).toUpperCase();
}

export default function Admin() {
  const [token, setToken] = useState('');
  const [agents, setAgents] = useState<(A & { code: string })[] | null>(null);
  const [msg, setMsg] = useState('');

  const h = (t = token) => ({ authorization: `Bearer ${t}`, 'content-type': 'application/json' });

  async function load(t = token) {
    setMsg('');
    const r = await fetch('/api/admin/agent', { headers: h(t) });
    const j = await r.json();
    if (!r.ok) return setMsg(j.error);
    try { sessionStorage.setItem(TOKEN, t); } catch { /* storage blocked */ }
    setAgents(await Promise.all((j.agents as A[]).map(async (a) => ({ ...a, code: await sha6(a.id) }))));
  }

  async function act(agentId: string, action: string) {
    const r = await fetch('/api/admin/agent', { method: 'POST', headers: h(), body: JSON.stringify({ agentId, action }) });
    const j = await r.json();
    setMsg(r.ok ? `${action} ok` : j.error);
    load();
  }

  async function sync() {
    setMsg('Syncing chain…');
    const r = await fetch('/api/sync', { method: 'POST', headers: h() });
    const j = await r.json();
    setMsg(r.ok ? `Sync done: ${j.added} new ledger entries${j.note ? ` (${j.note})` : ''}` : j.error);
  }

  useEffect(() => {
    try { const t = sessionStorage.getItem(TOKEN); if (t) { setToken(t); load(t); } } catch { /* storage blocked */ }
  }, []);

  return (
    <main className="wrap">
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="eyebrow">Operator</div>
        <h1 style={{ fontSize: 36 }}>Admin console</h1>
      </section>
      {!agents ? (
        <div className="card" style={{ maxWidth: 480 }}>
          <div className="field"><label>Admin token</label>
            <input className="input" type="password" value={token} onChange={(e) => setToken(e.target.value)} /></div>
          <button className="btn primary" disabled={!token} onClick={() => load()}>Enter</button>
          {msg && <div className="callout warn" style={{ marginTop: 12 }}>{msg}</div>}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
            <button className="btn primary" onClick={sync}>Sync chain now</button>
            <button className="btn" onClick={() => load()}>Reload</button>
            {msg && <span className="sub">{msg}</span>}
          </div>
          <p className="sub">Verify a line only after the project&apos;s X account has posted its code.</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Agent</th><th>X handle</th><th>Verify code</th><th>Wallet</th><th>State</th><th>Actions</th></tr></thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.id}>
                    <td><strong>{a.name}</strong>{a.mint && <div className="sub mono">{a.mint.slice(0, 6)}…</div>}</td>
                    <td>{a.xHandle ? <a href={`https://x.com/search?q=${encodeURIComponent(`from:${a.xHandle} "${a.code}"`)}&f=live`} target="_blank" rel="noreferrer">@{a.xHandle} ↗</a> : <span className="sub">collateral only</span>}</td>
                    <td className="mono">{a.code}</td>
                    <td className="mono sub">{a.wallet.slice(0, 4)}…{a.wallet.slice(-4)}</td>
                    <td>{a.frozen ? <span className="pill warn">frozen</span> : a.verified ? <span className="pill live">verified</span> : <span className="pill">pending</span>}</td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      {a.mint && !a.verified && <button className="btn" onClick={() => act(a.id, 'verify')}>Verify</button>}
                      {a.verified && <button className="btn" onClick={() => act(a.id, 'unverify')}>Unverify</button>}
                      <button className="btn" onClick={() => act(a.id, a.frozen ? 'unfreeze' : 'freeze')}>{a.frozen ? 'Unfreeze' : 'Freeze'}</button>
                    </td>
                  </tr>
                ))}
                {!agents.length && <tr><td colSpan={6} className="sub">No agents yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
