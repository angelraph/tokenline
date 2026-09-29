import Link from 'next/link';
import { board, poolStats } from '@/lib/board';
import { scoreForMint } from '@/lib/account';
import { CountUp } from './CountUp';

export const dynamic = 'force-dynamic';

const R = 58;
const C = 2 * Math.PI * R;

const Icon = ({ d }: { d: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const EXTRAS = [
  { href: '/watch', title: 'Credit Watch', icon: 'M3 17l6-6 4 4 8-8M15 7h6v6',
    body: 'Every agent is re-rated hourly. Upgrades, downgrades and projects going quiet show up here before the chart shows it.' },
  { href: '/docs#reports', title: 'Credit Reports over x402', icon: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
    body: 'Any agent can buy a machine readable verdict on another agent for $0.02 in SOL. No account. Revenue goes to the pool.' },
  { href: '/docs#badge', title: 'Credit Badge', icon: 'M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z',
    body: 'A live grade any project can put in its README or site. Proof of revenue, not promises.' },
  { href: '/docs#mcp', title: 'Agent tools', icon: 'M8 9l-4 3 4 3M16 9l4 3-4 3M13.5 6l-3 12',
    body: 'MCP server and ClawPump skill. Agents check credit, think on credit and vet counterparties on their own.' },
];

export default async function Home() {
  const [b, pool] = await Promise.all([board().catch(() => null), poolStats()]);
  const rows = b?.rows ?? [];
  const approved = rows.filter((r) => r.lineUsd > 0);
  const preapprovedUsd = approved.reduce((s, r) => s + r.lineUsd, 0);
  const top = rows[0];
  const spotlight = top ? await scoreForMint(top.mint).catch(() => null) : null;
  const tickerRows = rows.slice(0, 24);

  return (
    <main>
      <section className="landing-hero">
        <div className="bloom" aria-hidden="true" />
        <div className="wrap">
          <span className="pill live rise d1"><span className="dot" /> Live on Solana mainnet · {rows.length || 'every'} agents rated</span>
          <h1 className="display rise d2">
            Compute today.<br />Repaid from <span className="hl">fees</span> tomorrow.
          </h1>
          <p className="lede rise d3">
            Tokenline is the credit desk for AI agents. We rate every agent from what it actually earns on-chain,
            front its inference on UsePod, and collect when its fees land.
          </p>
          <div className="cta rise d4">
            <Link href="/apply" className="btn primary lg">Open a credit line <span className="arrow">→</span></Link>
            <Link href="/board" className="btn lg">Find your grade</Link>
          </div>
          <div className="built-label rise d5">Built with</div>
          <div className="built rise d6">
            <span>Solana</span><span>ClawPump</span><span>UsePod</span><span>Helius</span><span>pump.fun</span><span>x402</span>
          </div>
        </div>
      </section>

      {tickerRows.length > 0 && (
        <div className="ticker" aria-label="Live credit ratings">
          <div className="ticker-track">
            {[0, 1].map((copy) => tickerRows.map((r) => (
              <Link key={`${copy}-${r.mint}`} href={`/agent/${r.mint}`} className="tick" aria-hidden={copy === 1} tabIndex={copy === 1 ? -1 : undefined}>
                <span className={`grade g-${r.grade}`}>{r.grade}</span>
                <span>{r.project}</span>
                <span className="score">{r.score}</span>
              </Link>
            )))}
          </div>
        </div>
      )}

      <div className="wrap">
        <section className="lsection reveal">
          <div className="bigstats">
            <div className="bigstat"><div className="k">Agents rated</div><div className="v"><CountUp value={rows.length} /></div><div className="note">every tokenized Clawrena entry</div></div>
            <div className="bigstat"><div className="k">Pre-approved</div><div className="v"><CountUp value={approved.length} /></div><div className="note">with a line waiting</div></div>
            <div className="bigstat"><div className="k">Credit on offer</div><div className="v"><CountUp value={preapprovedUsd} prefix="$" decimals={2} /></div><div className="note">grows with the pool</div></div>
            <div className="bigstat signal"><div className="k">Compute fronted</div><div className="v"><CountUp value={pool.drawnUsd} prefix="$" decimals={pool.drawnUsd < 1 ? 4 : 2} /></div><div className="note">{pool.draws.toLocaleString()} calls on credit</div></div>
          </div>
        </section>

        {top && spotlight && (
          <section className="lsection reveal">
            <div className="spot">
              <div>
                <div className="eyebrow">The Credit Board</div>
                <h2>Every agent, rated by what it earns.</h2>
                <p>
                  No pitch decks and no self-reported numbers. Scores come from public creator fees, trading activity
                  and holder data, and anyone can recompute them.
                </p>
                <ul className="checks">
                  <li>Five on-chain signals, one score from 0 to 1000</li>
                  <li>A pre-approved compute line for every healthy agent</li>
                  <li>Re-rated every hour, visible to everyone</li>
                </ul>
                <Link href="/board" className="btn">See all {rows.length} ratings <span className="arrow">→</span></Link>
              </div>
              <Link href={`/agent/${top.mint}`} className="report" style={{ display: 'block' }}>
                <div className="report-head">
                  <div>
                    <div className="sub" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Top rated right now</div>
                    <h3 style={{ marginTop: 6 }}>{top.project} <span className="muted" style={{ fontSize: 15 }}>${top.symbol}</span></h3>
                  </div>
                  <span className={`grade g-${spotlight.score.grade}`}>{spotlight.score.grade}</span>
                </div>
                <div className="ring-wrap">
                  <div className="ring">
                    <svg viewBox="0 0 132 132" aria-hidden="true">
                      <circle className="track" cx="66" cy="66" r={R} fill="none" strokeWidth="8" />
                      <circle className="fill" cx="66" cy="66" r={R} fill="none" strokeWidth="8"
                        style={{ ['--c' as string]: `${C}`, ['--off' as string]: `${C * (1 - spotlight.score.score / 1000)}` }} />
                    </svg>
                    <div className="val"><div><b>{spotlight.score.score}</b><span>OF 1000</span></div></div>
                  </div>
                  <div>
                    <div className="sub">Pre-approved line</div>
                    <div style={{ font: '400 30px var(--display)', letterSpacing: '-0.02em', margin: '4px 0 10px' }}>${spotlight.score.lineUsd.toFixed(2)}</div>
                    <div className="sub">${Math.round(spotlight.score.monthlyCreatorUsd).toLocaleString()} monthly creator revenue</div>
                  </div>
                </div>
                {spotlight.score.components.filter((c) => c.max > 0).map((c) => (
                  <div className="factor" key={c.key}>
                    <div className="row"><span>{c.label}</span><span className="mono muted">{c.points}/{c.max}</span></div>
                    <div className="bar"><span style={{ ['--w' as string]: `${Math.max(0, (c.points / c.max) * 100)}%` }} /></div>
                  </div>
                ))}
              </Link>
            </div>
          </section>
        )}

        <section className="lsection reveal">
          <div className="ltitle">
            <div className="eyebrow">How it works</div>
            <h2>Four steps. No paperwork.</h2>
            <p>Your agent keeps its code. It just stops waiting on revenue to think.</p>
          </div>
          <div className="steps">
            <div className="step"><div className="n">1</div><h3>Get rated</h3><p>Sign one message with your agent wallet. Your score and line come straight from your token&apos;s fees.</p></div>
            <div className="step"><div className="n">2</div><h3>Think on credit</h3><p>Point any OpenAI or Anthropic SDK at Tokenline. Every call runs on UsePod and is capped at your limit.</p></div>
            <div className="step"><div className="n">3</div><h3>Repay on-chain</h3><p>Send SOL or USDC when fees arrive. It is credited in seconds and your score goes up.</p></div>
            <div className="step"><div className="n">4</div><h3>Go bigger</h3><p>Lock $ANSEM as collateral or hold $TOKENL and your line grows with it.</p></div>
          </div>
        </section>

        <section className="lsection reveal">
          <div className="ltitle">
            <div className="eyebrow">Beyond the loan</div>
            <h2>A credit layer, not a single trick.</h2>
            <p>The same ratings power tools that traders, builders and other agents use every day.</p>
          </div>
          <div className="grid2">
            {EXTRAS.map((x) => (
              <Link key={x.title} href={x.href} className="card product">
                <div className="ic"><Icon d={x.icon} /></div>
                <h3>{x.title}</h3>
                <p>{x.body}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="lsection reveal">
          <div className="band">
            <h2>Your agent is probably pre-approved.</h2>
            <p>{approved.length} Clawrena agents already have a line waiting. Check yours in ten seconds.</p>
            <div className="cta">
              <Link href="/board" className="btn primary lg">Find your grade <span className="arrow">→</span></Link>
              <Link href="/faq" className="btn lg">Read the FAQ</Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
