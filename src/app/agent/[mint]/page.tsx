import Link from 'next/link';
import { notFound } from 'next/navigation';
import { scoreForMint } from '@/lib/account';
import { creditMemo } from '@/lib/memo';
import { store } from '@/lib/store';
import { tally } from '@/lib/account';
import { config } from '@/lib/config';
import { verdict } from '@/lib/verdict';

export const dynamic = 'force-dynamic';

export default async function AgentPage({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  const agent = (await store.listAgents()).find((a) => a.mint === mint) ?? null;
  const history = agent ? tally(await store.listEvents({ agentId: agent.id, limit: 10_000 })) : undefined;
  const r = await scoreForMint(mint, history);
  if (!r) notFound();
  const { project: p, score: s } = r;
  const memo = await creditMemo(p, s, { llm: !!agent });
  const v = verdict(s);
  const badgeUrl = `${config.baseUrl}/api/badge/${mint}`;

  return (
    <main className="wrap">
      <section className="hero" style={{ paddingBottom: 12 }}>
        <div className="eyebrow">Credit report · {p.xHandle ? `@${p.xHandle}` : 'Clawrena entry'}</div>
        <h1 style={{ fontSize: 44 }}>
          {p.projectName} <span className="muted" style={{ fontSize: 26 }}>${p.symbol}</span>
        </h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className={`grade g-${s.grade}`} style={{ fontSize: 18, padding: '6px 14px' }}>{s.grade}</span>
          <span className="mono" style={{ fontSize: 22 }}>{s.score}<span className="muted">/1000</span></span>
          <span className={`pill ${v.verdict === 'extend' ? 'live' : 'warn'}`}><span className="dot" />counterparty: {v.verdict}</span>
          {agent && <span className={`pill ${agent.verified ? 'live' : 'warn'}`}><span className="dot" />{agent.verified ? 'line open' : 'verification pending'}</span>}
          <a className="sub mono" href={`https://solscan.io/token/${mint}`} target="_blank" rel="noreferrer">{mint.slice(0, 6)}…{mint.slice(-6)} ↗</a>
        </div>
      </section>

      <div className="stats">
        <div className="stat"><div className="k">Pre-approved line</div><div className="v">${s.lineUsd.toFixed(2)}</div></div>
        <div className="stat"><div className="k">Creator revenue / mo</div><div className="v">${Math.round(s.monthlyCreatorUsd).toLocaleString()}</div></div>
        <div className="stat"><div className="k">Creator fees (SOL)</div><div className="v">{(p.grossFeesSol - p.platformFeesSol).toFixed(2)}</div></div>
        <div className="stat"><div className="k">Fee collections</div><div className="v">{p.collections}</div></div>
      </div>

      <div className="grid2">
        <div className="card">
          <h3>Score breakdown</h3>
          {s.components.map((c) => (
            <div key={c.key} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span>{c.label}</span>
                <span className="mono">{c.points}{c.max ? `/${c.max}` : ''}</span>
              </div>
              {c.max > 0 && <div className="bar" style={{ margin: '6px 0 4px' }}><span style={{ width: `${Math.max(0, (c.points / c.max) * 100)}%` }} /></div>}
              <div className="sub">{c.detail}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <div className="card">
            <h3>Credit memo</h3>
            <p style={{ lineHeight: 1.6, margin: 0 }}>{memo.text}</p>
            <p className="sub" style={{ marginBottom: 0 }}>
              {memo.source === 'usepod' ? 'Written by an LLM bought on UsePod through Tokenline.' : 'Rules-based memo.'}
            </p>
          </div>
          <div className="card">
            <h3>{agent ? 'Manage this line' : 'Is this your agent?'}</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              {s.lineUsd > 0
                ? `Claim $${s.lineUsd.toFixed(2)} of UsePod compute, repaid from your fees. Lock $ANSEM to go higher.`
                : s.stale ? 'Fees have gone quiet, so there is no unsecured line. You can still open a collateral-backed line with $ANSEM.'
                : 'No unsecured line yet. Open a collateral-backed line with $ANSEM.'}
            </p>
            <Link className="btn primary" href={agent ? '/account' : `/apply?mint=${mint}`}>{agent ? 'Open my line →' : 'Claim this line →'}</Link>
          </div>
          <div className="card">
            <h3>Show your rating</h3>
            <img src={`/api/badge/${mint}`} alt={`Tokenline credit ${s.grade}`} height={22} />
            <p className="sub">Paste into a README or site. It updates live.</p>
            <pre className="code">{`[![Tokenline credit](${badgeUrl})](${config.baseUrl}/agent/${mint})`}</pre>
          </div>
        </div>
      </div>
    </main>
  );
}
