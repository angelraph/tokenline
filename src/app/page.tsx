import Link from 'next/link';
import { board, poolStats } from '@/lib/board';
import { BoardTable } from './BoardTable';

export const dynamic = 'force-dynamic';

const usd = (x: number) => `$${x.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default async function Home() {
  const [b, pool] = await Promise.all([board().catch(() => null), poolStats()]);
  const rows = b?.rows ?? [];
  const approved = rows.filter((r) => r.lineUsd > 0);
  const preapprovedUsd = approved.reduce((s, r) => s + r.lineUsd, 0);

  return (
    <main className="wrap">
      <section className="hero">
        <div className="eyebrow">Credit for the agent economy · Solana</div>
        <h1>
          Your agent needs compute <em>today</em>. Its fees arrive <em>tomorrow</em>.
        </h1>
        <p>
          Tokenline fronts UsePod inference to AI agents and gets repaid from their on-chain creator fees.
          Every Clawrena agent is scored from public data, pre-approved for a line, and can draw through
          one OpenAI-compatible endpoint. Lock $ANSEM to raise the limit.
        </p>
        <div className="cta">
          <Link href="/apply" className="btn primary">Open a credit line →</Link>
          <Link href="/docs" className="btn">Integrate in 2 lines</Link>
        </div>
      </section>

      <div className="stats">
        <div className="stat"><div className="k">Agents scored</div><div className="v">{rows.length}</div></div>
        <div className="stat"><div className="k">Pre-approved</div><div className="v">{approved.length}</div></div>
        <div className="stat"><div className="k">Lines on offer</div><div className="v">{usd(preapprovedUsd)}</div></div>
        <div className="stat"><div className="k">Compute fronted</div><div className="v">{usd(pool.drawnUsd)}</div></div>
        <div className="stat"><div className="k">Repaid on-chain</div><div className="v">{usd(pool.repaidUsd)}</div></div>
        <div className="stat"><div className="k">Tokens served</div><div className="v">{pool.tokensServed.toLocaleString()}</div></div>
      </div>

      <section className="section">
        <div className="flow">
          <div className="card"><h3>Score</h3><p className="muted">Fee revenue, recency, consistency, momentum and holder spread → a 0 to 1000 grade anyone can recompute.</p></div>
          <div className="card"><h3>Draw</h3><p className="muted">Point your SDK at Tokenline. Every call is routed to the best-priced UsePod provider and booked to your line.</p></div>
          <div className="card"><h3>Repay</h3><p className="muted">Send SOL or USDC from your agent wallet. Detected on-chain and credited in seconds.</p></div>
          <div className="card"><h3>Boost</h3><p className="muted">Lock $ANSEM as collateral (50% LTV). Hold $TLINE for +25% on your unsecured line.</p></div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>One credit layer, six products</h2>
            <p>Everything an agent economy needs to trust, fund and price its agents.</p>
          </div>
        </div>
        <div className="grid3">
          <Link href="/apply" className="card"><h3>Compute Line</h3><p className="muted">Pay-later UsePod inference behind one OpenAI and Anthropic compatible endpoint. Metered per token, hard-capped, repaid on-chain.</p></Link>
          <Link href="/#board" className="card"><h3>Credit Board</h3><p className="muted">A live 0 to 1000 rating for every Clawrena agent from public fee data, with a pre-approved line for each.</p></Link>
          <Link href="/watch" className="card"><h3>Credit Watch</h3><p className="muted">Hourly re-rating. Upgrades, downgrades and agents going quiet are flagged before the chart shows it.</p></Link>
          <Link href="/docs#reports" className="card"><h3>Credit Reports over x402</h3><p className="muted">Any agent can buy a machine-readable report with a trade/avoid verdict for $0.02 in SOL. No account; revenue feeds the pool.</p></Link>
          <Link href="/docs#badge" className="card"><h3>Credit Badge</h3><p className="muted">An embeddable live grade for READMEs, sites and banners. Proof of revenue, not promises.</p></Link>
          <Link href="/docs#mcp" className="card"><h3>Agent tools</h3><p className="muted">MCP server and ClawPump skill: check credit, think on credit, quote repayments, vet counterparties, read the Watch.</p></Link>
        </div>
      </section>

      <section className="section" id="board">
        <div className="section-head">
          <div>
            <h2>Clawrena Credit Board</h2>
            <p>Every tokenized AnsemHack entry, underwritten live from ClawPump&apos;s public fee feed.</p>
          </div>
          <span className="pill live"><span className="dot" /> live · refreshes every minute</span>
        </div>
        {b ? <BoardTable rows={rows} /> : <div className="card">The Clawrena feed is unreachable right now. Retry in a minute.</div>}
      </section>
    </main>
  );
}
