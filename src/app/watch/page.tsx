import Link from 'next/link';
import { board } from '@/lib/board';
import { movers, type Move } from '@/lib/watch';

export const dynamic = 'force-dynamic';

const LABEL: Record<Move['kind'], string> = {
  upgrade: 'Upgrade', downgrade: 'Downgrade', newly_approved: 'Line approved', line_pulled: 'Line pulled',
};

export default async function Watch({ searchParams }: { searchParams: Promise<{ hours?: string }> }) {
  const hours = Math.min(168, Math.max(1, Number((await searchParams).hours) || 24));
  const { rows } = await board();
  const { since, moves } = await movers(rows, hours);
  const dormant = rows.filter((r) => r.stale && r.score >= 300).slice(0, 12);

  return (
    <main className="wrap">
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="eyebrow">Credit Watch</div>
        <h1 style={{ fontSize: 40 }}>Who got stronger. Who went quiet.</h1>
        <p>Every Clawrena entry is re-scored hourly. Upgrades, downgrades and pulled lines show up here first, so agents
          and traders can react before the chart does.</p>
        <div className="cta">
          {[6, 24, 72, 168].map((h) => (
            <Link key={h} href={`/watch?hours=${h}`} className={`btn${h === hours ? ' primary' : ''}`}>{h < 48 ? `${h}h` : `${h / 24}d`}</Link>
          ))}
        </div>
      </section>

      <div className="section">
        <div className="section-head">
          <div>
            <h2>Rating actions</h2>
            <p>{since ? `Compared with ${new Date(since).toLocaleString()}` : 'The first snapshot was just taken; moves appear from the next hour.'}</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Project</th><th>Action</th><th className="num">Score</th><th className="num hide-sm">Line</th></tr></thead>
            <tbody>
              {moves.map((m) => (
                <tr key={m.mint}>
                  <td><Link href={`/agent/${m.mint}`}><strong>{m.project}</strong></Link> <span className="sub">${m.symbol}</span></td>
                  <td><span className={`pill ${m.kind === 'upgrade' || m.kind === 'newly_approved' ? 'live' : 'warn'}`}><span className="dot" />{LABEL[m.kind]}</span></td>
                  <td className="num">{m.from} → {m.to} <span className="sub">({m.delta > 0 ? '+' : ''}{m.delta})</span></td>
                  <td className="num hide-sm">${m.lineFrom.toFixed(2)} → ${m.lineTo.toFixed(2)}</td>
                </tr>
              ))}
              {!moves.length && <tr><td colSpan={4} className="sub">No rating actions in this window.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <div className="section-head"><div><h2>Gone quiet</h2><p>Real revenue history, but no fees for over a week. Unsecured lines are paused.</p></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Project</th><th>Grade</th><th className="num">Last fee</th></tr></thead>
            <tbody>
              {dormant.map((r) => (
                <tr key={r.mint}>
                  <td><Link href={`/agent/${r.mint}`}><strong>{r.project}</strong></Link> <span className="sub">${r.symbol}</span></td>
                  <td><span className={`grade g-${r.grade}`}>{r.grade}</span></td>
                  <td className="num">{r.lastFeeAt ? `${Math.round((Date.now() - Date.parse(r.lastFeeAt)) / 86_400_000)}d ago` : 'never'}</td>
                </tr>
              ))}
              {!dormant.length && <tr><td colSpan={3} className="sub">Nobody has gone quiet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
