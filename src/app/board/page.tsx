import type { Metadata } from 'next';
import { board } from '@/lib/board';
import { deltas } from '@/lib/watch';
import { BoardTable } from '../BoardTable';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Credit Board | Tokenline',
  description: 'Live credit ratings for every tokenized AnsemHack Clawrena agent, computed from on-chain creator fees.',
};

const GRADES = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'C'] as const;
const GRADE_COLOR: Record<string, string> = {
  AAA: 'var(--accent)', AA: 'var(--accent)', A: 'var(--cyan)', BBB: 'var(--cyan)', BB: 'var(--warn)', B: 'var(--warn)', C: 'var(--bad)',
};
const usd = (x: number) => `$${Math.round(x).toLocaleString('en-US')}`;

export default async function Board() {
  const b = await board().catch(() => null);
  const rows = b?.rows ?? [];
  const d = rows.length ? await deltas(rows, 24) : { since: null, byMint: {} };
  const approved = rows.filter((r) => r.lineUsd > 0);
  const totalRev = rows.reduce((s, r) => s + r.monthlyCreatorUsd, 0);
  const avg = rows.length ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length) : 0;
  const byRev = [...rows].sort((a, x) => x.monthlyCreatorUsd - a.monthlyCreatorUsd);
  const lead = byRev[0], second = byRev[1];
  const counts = GRADES.map((g) => ({ g, n: rows.filter((r) => r.grade === g).length }));
  const maxN = Math.max(1, ...counts.map((c) => c.n));

  return (
    <main className="wrap">
      <section className="phead">
        <div className="eyebrow">Credit Board</div>
        <h1 className="ptitle">Every Clawrena agent, rated live</h1>
        <p className="plede">Scores come from ClawPump&apos;s public fee data and the Solana chain. Click any agent for its full credit report.</p>
      </section>

      {lead && second && second.monthlyCreatorUsd > 0 && (
        <div className="insight">
          <span className="tag">Insight</span>
          <span>
            {lead.project} earns {(lead.monthlyCreatorUsd / second.monthlyCreatorUsd).toFixed(1)}x the creator revenue of the next agent,
            {' '}{usd(lead.monthlyCreatorUsd)} a month against {usd(second.monthlyCreatorUsd)}. {approved.length} agents qualify for a line today.
          </span>
        </div>
      )}

      <div className="split" style={{ marginTop: 6 }}>
        <div className="panel">
          <div className="ptabs"><span className="ptab on">Overview</span></div>
          <div className="pbody">
            <div className="sub" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Creator revenue rated</div>
            <div style={{ font: '600 36px var(--display)', margin: '6px 0 16px' }}>{usd(totalRev)}<span className="sub" style={{ fontSize: 14 }}> / month</span></div>
            <div className="kv">
              <div className="kv-row"><span className="l" title="Tokenized Clawrena entries in ClawPump's fee feed">Agents rated</span><span className="r">{rows.length}</span></div>
              <div className="kv-row"><span className="l" title="Agents with an unsecured line available today">Pre-approved</span><span className="r">{approved.length}</span></div>
              <div className="kv-row"><span className="l" title="Mean score across every rated agent">Average score</span><span className="r">{avg} / 1000</span></div>
              <div className="kv-row"><span className="l" title="Real revenue history but no fees for over a week">Dormant</span><span className="r">{rows.filter((r) => r.stale).length}</span></div>
              <div className="kv-row"><span className="l" title="Sum of every pre-approved unsecured line">Credit on offer</span><span className="r">${approved.reduce((s, r) => s + r.lineUsd, 0).toFixed(2)}</span></div>
            </div>
          </div>
        </div>
        <div className="panel">
          <div className="ptabs"><span className="ptab on">Grade distribution</span></div>
          <div className="pbody reveal">
            <div className="dist">
              {counts.map((c) => (
                <div key={c.g} className="dist-row">
                  <span className={`grade g-${c.g}`}>{c.g}</span>
                  <div className="dist-bar"><span style={{ ['--w' as string]: `${(c.n / maxN) * 100}%`, background: GRADE_COLOR[c.g] }} /></div>
                  <span className="mono" style={{ textAlign: 'right' }}>{c.n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {b
        ? <BoardTable rows={rows} deltas={d.byMint} hasHistory={d.since !== null} />
        : <div className="card" style={{ marginTop: 16 }}>The Clawrena feed is unreachable right now. Retry in a minute.</div>}
    </main>
  );
}
