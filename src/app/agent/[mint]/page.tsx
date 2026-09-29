import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { scoreForMint, tally } from '@/lib/account';
import { creditMemo } from '@/lib/memo';
import { store } from '@/lib/store';
import { config } from '@/lib/config';
import { verdict } from '@/lib/verdict';
import { history as scoreHistory } from '@/lib/watch';
import { CopyButton, Tabs } from '../../Tabs';
import { avatarStyle, initials, Icon } from '../../ui';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ mint: string }> }): Promise<Metadata> {
  const { mint } = await params;
  const r = await scoreForMint(mint).catch(() => null);
  return r
    ? { title: `${r.project.projectName} credit report | Tokenline`, description: `${r.project.projectName} is rated ${r.score.grade} (${r.score.score}/1000) on Tokenline.` }
    : { title: 'Credit report | Tokenline' };
}

const R = 58;
const C = 2 * Math.PI * R;

function HistoryChart({ points }: { points: { at: number; score: number }[] }) {
  if (points.length < 2) {
    return <p className="muted" style={{ margin: '28px 0', textAlign: 'center' }}>Tokenline re-rates this agent every hour. The score history fills in from here.</p>;
  }
  const W = 560, H = 190, P = 26;
  const min = Math.max(0, Math.min(...points.map((p) => p.score)) - 40), max = Math.min(1000, Math.max(...points.map((p) => p.score)) + 40);
  const t0 = points[0].at, t1 = points[points.length - 1].at;
  const x = (t: number) => P + ((t - t0) / Math.max(1, t1 - t0)) * (W - P * 2);
  const y = (s: number) => H - P - ((s - min) / Math.max(1, max - min)) * (H - P * 2);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.at).toFixed(1)},${y(p.score).toFixed(1)}`).join(' ');
  const area = `${line} L${x(t1).toFixed(1)},${H - P} L${x(t0).toFixed(1)},${H - P} Z`;
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Score history">
      <defs>
        <linearGradient id="tlArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4d7cfe" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#4d7cfe" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((f) => <line key={f} className="gridl" x1={P} x2={W - P} y1={P + f * (H - P * 2)} y2={P + f * (H - P * 2)} />)}
      <text x={4} y={P + 4}>{Math.round(max)}</text>
      <text x={4} y={H - P + 4}>{Math.round(min)}</text>
      <path className="area" d={area} />
      <path className="line" d={line} />
    </svg>
  );
}

export default async function AgentPage({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  const agent = (await store.listAgents()).find((a) => a.mint === mint) ?? null;
  const hist = agent ? tally(await store.listEvents({ agentId: agent.id, limit: 10_000 })) : undefined;
  const r = await scoreForMint(mint, hist);
  if (!r) notFound();
  const { project: p, score: s } = r;
  const [memo, points] = await Promise.all([creditMemo(p, s, { llm: !!agent }), scoreHistory(mint)]);
  const v = verdict(s);
  const reportUrl = `${config.baseUrl}/agent/${mint}`;
  const badgeUrl = `${config.baseUrl}/api/badge/${mint}`;
  const shareText = `${p.projectName} is rated ${s.grade} (${s.score}/1000) on @tokenlinehq, scored from on-chain creator fees.`;
  const creatorSol = p.grossFeesSol - p.platformFeesSol;
  const lastFee = p.lastFeeAt ? new Date(p.lastFeeAt).toUTCString().replace(' GMT', ' UTC') : 'never';

  const reportPane = (
    <div className="kv">
      <div className="kv-row"><span className="l" title="Unsecured compute line available on verification">Pre-approved line</span><span className="r" style={{ color: 'var(--accent)' }}>${s.lineUsd.toFixed(2)}</span></div>
      <div className="kv-row"><span className="l" title="Creator fees annualised to a 30 day run rate">Creator revenue / month</span><span className="r">${Math.round(s.monthlyCreatorUsd).toLocaleString('en-US')}</span></div>
      <div className="kv-row"><span className="l" title="Gross fees minus ClawPump's platform share">Creator fees earned</span><span className="r">{creatorSol.toFixed(2)} SOL</span></div>
      <div className="kv-row"><span className="l" title="Times fees were collected on-chain">Fee collections</span><span className="r">{p.collections.toLocaleString('en-US')}</span></div>
      <div className="kv-row"><span className="l" title="Trading volume in the last 24 hours">24h volume</span><span className="r">${Math.round(p.volume24hUsd).toLocaleString('en-US')}</span></div>
      <div className="kv-row"><span className="l" title="Most recent fee collection">Last fee</span><span className="r">{lastFee}</span></div>
      <div className="kv-row"><span className="l" title="Guidance for agents dealing with this one">Counterparty verdict</span><span className="r" style={{ color: v.verdict === 'extend' ? 'var(--accent)' : 'var(--warn)' }}>{v.verdict}</span></div>
    </div>
  );

  const factorsPane = (
    <div className="factors now">
      {s.components.map((c) => (
        <div className="factor" key={c.key} style={{ marginBottom: 16 }}>
          <div className="row"><span>{c.label}</span><span className="mono muted">{c.points}{c.max ? `/${c.max}` : ''}</span></div>
          {c.max > 0 && <div className="bar"><span style={{ ['--w' as string]: `${Math.max(0, (c.points / c.max) * 100)}%` }} /></div>}
          <div className="sub" style={{ marginTop: 5 }}>{c.detail}</div>
        </div>
      ))}
    </div>
  );

  const memoPane = (
    <div>
      <p style={{ lineHeight: 1.7, margin: '0 0 12px', fontSize: 15 }}>{memo.text}</p>
      <p className="sub" style={{ margin: 0 }}>{memo.source === 'usepod' ? 'Written by an AI model bought on UsePod through Tokenline.' : 'Generated from the score factors.'}</p>
    </div>
  );

  const badgePane = (
    <div>
      <img src={`/api/badge/${mint}`} alt={`Tokenline credit ${s.grade}`} height={22} />
      <p className="sub">Paste into a README or site. It updates live.</p>
      <pre className="code">{`[![Tokenline credit](${badgeUrl})](${reportUrl})`}</pre>
    </div>
  );

  return (
    <main className="wrap">
      <section className="entity">
        <div className="avatar" style={avatarStyle(mint)}>{initials(p.projectName)}</div>
        <div style={{ minWidth: 0 }}>
          <div className="entity-name">
            {p.projectName} <span className="muted">(${p.symbol})</span>
            <CopyButton text={mint} label="Copy mint address" />
          </div>
          <div className="entity-val">
            <b>{s.score}</b><span className="muted mono">/ 1000</span>
            <span className={`grade g-${s.grade}`} style={{ fontSize: 13, padding: '5px 12px' }}>{s.grade}</span>
          </div>
          <div className="entity-chips">
            <span className="chip">Clawrena agent</span>
            {s.lineUsd > 0 && <span className="chip" style={{ color: 'var(--accent)' }}>Pre-approved</span>}
            {s.stale && <span className="chip" style={{ color: 'var(--warn)' }}>Dormant</span>}
            {agent && <span className="chip" style={{ color: agent.verified ? 'var(--accent)' : 'var(--warn)' }}>{agent.verified ? 'Line open' : 'Verification pending'}</span>}
            {p.xHandle && <a className="chip" href={`https://x.com/${p.xHandle}`} target="_blank" rel="noreferrer">@{p.xHandle}</a>}
          </div>
        </div>
        <div className="entity-actions">
          <a href={`https://solscan.io/token/${mint}`} target="_blank" rel="noreferrer"><Icon name="ledger" size={14} /> Solscan</a>
          <Link href="/watch"><Icon name="alert" size={14} /> Credit Watch</Link>
          <a className="btn blue sm" href={`https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(reportUrl)}`} target="_blank" rel="noreferrer">
            <Icon name="share" size={14} /> Share
          </a>
        </div>
      </section>

      <div className="split">
        <Tabs watermark="Tokenline" panes={[
          { label: 'Report', content: reportPane },
          { label: 'Factors', content: factorsPane },
          { label: 'Memo', content: memoPane },
        ]} />
        <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <Tabs panes={[
            { label: 'Score', content: (
              <div className="ring-wrap" style={{ margin: 0 }}>
                <div className="ring now">
                  <svg viewBox="0 0 132 132" aria-hidden="true">
                    <circle className="track" cx="66" cy="66" r={R} fill="none" strokeWidth="8" />
                    <circle className="fill" cx="66" cy="66" r={R} fill="none" strokeWidth="8"
                      style={{ ['--c' as string]: `${C}`, ['--off' as string]: `${C * (1 - s.score / 1000)}` }} />
                  </svg>
                  <div className="val"><div><b>{s.score}</b><span>OF 1000</span></div></div>
                </div>
                <div>
                  <div className="sub">Grade</div>
                  <div style={{ font: '600 30px var(--display)', margin: '2px 0 8px' }}>{s.grade}</div>
                  <div className="sub" style={{ maxWidth: 220, lineHeight: 1.5 }}>{v.reason}</div>
                </div>
              </div>
            ) },
            { label: 'History', content: <HistoryChart points={points} /> },
            { label: 'Badge', content: badgePane },
          ]} />
          <div className="card signal">
            <h3>{agent ? 'Manage this line' : 'Is this your agent?'}</h3>
            <p className="muted" style={{ marginTop: 0, lineHeight: 1.6 }}>
              {s.lineUsd > 0
                ? `Claim $${s.lineUsd.toFixed(2)} of UsePod compute, repaid from your fees. Lock $ANSEM to go higher.`
                : s.stale ? 'Fees have gone quiet, so there is no unsecured line. A collateral line with $ANSEM still works.'
                : 'No unsecured line yet. Open a collateral line with $ANSEM.'}
            </p>
            <Link className="btn primary" href={agent ? '/account' : `/apply?mint=${mint}`}>{agent ? 'Open my line' : 'Claim this line'} <span className="arrow">→</span></Link>
          </div>
        </div>
      </div>
    </main>
  );
}
