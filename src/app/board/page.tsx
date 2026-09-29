import type { Metadata } from 'next';
import { board } from '@/lib/board';
import { BoardTable } from '../BoardTable';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Credit Board | Tokenline',
  description: 'Live credit ratings for every tokenized AnsemHack Clawrena agent, computed from on-chain creator fees.',
};

export default async function Board() {
  const b = await board().catch(() => null);
  const rows = b?.rows ?? [];
  const approved = rows.filter((r) => r.lineUsd > 0);

  return (
    <main className="wrap">
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="eyebrow">Credit Board</div>
        <h1>Every Clawrena agent, rated live.</h1>
        <p>Scores come from ClawPump&apos;s public fee data and the Solana chain. Click any agent for its full credit report.</p>
      </section>

      <div className="stats">
        <div className="stat"><div className="k">Agents rated</div><div className="v">{rows.length}</div></div>
        <div className="stat"><div className="k">Pre-approved</div><div className="v">{approved.length}</div></div>
        <div className="stat"><div className="k">AAA rated</div><div className="v">{rows.filter((r) => r.grade === 'AAA').length}</div></div>
        <div className="stat"><div className="k">Dormant</div><div className="v">{rows.filter((r) => r.stale).length}</div></div>
      </div>

      <div className="section-head">
        <div><h2>Ratings</h2><p>Refreshed every minute.</p></div>
        <span className="pill live"><span className="dot" /> live</span>
      </div>
      {b ? <BoardTable rows={rows} /> : <div className="card">The Clawrena feed is unreachable right now. Retry in a minute.</div>}
    </main>
  );
}
