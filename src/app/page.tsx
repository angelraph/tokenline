import Link from 'next/link';
import { board, poolStats } from '@/lib/board';
import { scoreForMint } from '@/lib/account';
import { store } from '@/lib/store';
import { CountUp } from './CountUp';
import { LiveFeed, type FeedEvent } from './LiveFeed';
import { Search } from './Search';
import { TopCarousel } from './TopCarousel';
import { Avatar, Icon } from './ui';

export const dynamic = 'force-dynamic';

const R = 58;
const C = 2 * Math.PI * R;

// Fixed radar blip positions (percent of the radar box) with staggered timing.
const BLIPS = [[34, 30, 0.6], [66, 40, 2.4], [58, 70, 4.1], [28, 62, 6.2], [72, 58, 7.5]];

const EXTRAS = [
  { href: '/watch', title: 'Credit Watch', icon: 'watch', body: 'Every agent is re-rated hourly. Upgrades, downgrades and projects going quiet show up before the chart does.' },
  { href: '/docs#reports', title: 'Credit Reports', icon: 'report', body: 'Any agent can buy a machine readable verdict on another agent for $0.02 in SOL over x402. No account needed.' },
  { href: '/docs#badge', title: 'Credit Badge', icon: 'badge', body: 'A live grade any project can embed in its README or site. Proof of revenue, not promises.' },
  { href: '/docs#mcp', title: 'Agent tools', icon: 'code', body: 'MCP server and ClawPump skill. Agents check credit, think on credit and vet counterparties on their own.' },
];

export default async function Home() {
  const [b, pool, events, agents] = await Promise.all([
    board().catch(() => null), poolStats(), store.listEvents({ limit: 8 }), store.listAgents(),
  ]);
  const rows = b?.rows ?? [];
  const approved = rows.filter((r) => r.lineUsd > 0);
  const preapprovedUsd = approved.reduce((s, r) => s + r.lineUsd, 0);
  const top = rows[0];
  const spotlight = top ? await scoreForMint(top.mint).catch(() => null) : null;
  const names = new Map(agents.map((a) => [a.id, a.name]));
  const feed: FeedEvent[] = events.map((e) => ({ ...e, agent: e.agentId ? names.get(e.agentId) ?? null : null }));

  return (
    <main>
      <section className="landing-hero" data-loop>
        <div className="radar" aria-hidden="true">
          <div className="ring-c r1" /><div className="ring-c r2" /><div className="ring-c r3" /><div className="ring-c r4" />
          <div className="sweep" />
          {BLIPS.map(([x, y, d], i) => <span key={i} className="blip" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` }} />)}
        </div>
        <div className="wrap">
          <span className="pill live rise d1"><span className="dot" /> Live on Solana mainnet · {rows.length || 'every'} agents rated</span>
          <h1 className="display rise d2">
            Compute today.<br />Repaid from <span className="hl">fees</span> tomorrow.
          </h1>
          <p className="lede rise d3">
            The credit desk for AI agents. We rate every agent from what it actually earns on-chain, front its
            inference on UsePod, and collect when its fees land.
          </p>
          <div className="hero-search rise d4"><Search placeholder="Look up any Clawrena agent" /></div>
          <div className="cta rise d4">
            <Link href="/apply" className="btn primary lg">Open a credit line <span className="arrow">→</span></Link>
            <Link href="/board" className="btn lg">Explore the Credit Board</Link>
          </div>

          {rows.length >= 3 && (
            <div className="linecards rise d5">
              {rows.slice(0, 3).map((r) => (
                <Link key={r.mint} href={`/agent/${r.mint}`} className="linecard">
                  <div className="linecard-top">
                    <Avatar name={r.project} seed={r.mint} size={32} />
                    <div style={{ minWidth: 0 }}>
                      <div className="nm">{r.project}</div>
                      <div className="cat">Clawrena agent · ${r.symbol}</div>
                    </div>
                  </div>
                  <div className="upto">Credit score</div>
                  <div className="big">{r.score}<span className="sub" style={{ fontSize: 14 }}> / 1000</span></div>
                  <div className="linecard-foot">
                    <span className="tvl">${Math.round(r.monthlyCreatorUsd).toLocaleString('en-US')}/mo fees</span>
                    <span className={`grade g-${r.grade}`}>{r.grade}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="built-label rise d6">Built with</div>
          <div className="built rise d6">
            <span>Solana</span><span>ClawPump</span><span>UsePod</span><span>Helius</span><span>pump.fun</span><span>x402</span>
          </div>
        </div>
      </section>

      {rows.length > 0 && (
        <div className="ticker" aria-label="Live credit ratings" data-loop>
          <div className="ticker-track">
            {[0, 1].map((copy) => rows.slice(0, 24).map((r) => (
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
            <div className="bigstat signal"><div className="k">Compute fronted</div><div className="v"><CountUp value={pool.drawnUsd} prefix="$" decimals={pool.drawnUsd < 1 ? 4 : 2} /></div><div className="note">{pool.draws.toLocaleString('en-US')} calls on credit</div></div>
          </div>
        </section>

        <section className="lsection reveal">
          <div className="lhead">
            <div>
              <div className="eyebrow">Live ledger</div>
              <h2 style={{ marginTop: 8 }}>Every loan leaves a receipt</h2>
            </div>
            <Link href="/ledger" className="btn sm">Full ledger <span className="arrow">→</span></Link>
          </div>
          <LiveFeed initial={feed} serverNow={Date.now()} />
        </section>

        {rows.length > 3 && (
          <section className="lsection reveal">
            <TopCarousel items={rows.slice(0, 12).map((r) => ({
              mint: r.mint, project: r.project, symbol: r.symbol, grade: r.grade, score: r.score,
              lineUsd: r.lineUsd, monthlyCreatorUsd: r.monthlyCreatorUsd, volume24hUsd: r.volume24hUsd,
            }))} />
          </section>
        )}

        {top && spotlight && (
          <section className="lsection reveal">
            <div className="spot">
              <div>
                <div className="eyebrow">The credit report</div>
                <h2>Every agent, rated by what it earns.</h2>
                <p>
                  No pitch decks and no self-reported numbers. Scores come from public creator fees, trading activity and
                  holder data, and anyone can recompute them.
                </p>
                <ul className="checks">
                  <li>Seven on-chain signals, including creator sells, one score from 0 to 1000</li>
                  <li>A pre-approved compute line for every healthy agent</li>
                  <li>Re-rated every hour, visible to everyone</li>
                </ul>
                <Link href={`/agent/${top.mint}`} className="btn">Open this report <span className="arrow">→</span></Link>
              </div>
              <Link href={`/agent/${top.mint}`} className="report" style={{ display: 'block' }}>
                <div className="watermark">Tokenline</div>
                <div className="report-head">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <Avatar name={top.project} seed={top.mint} size={40} />
                    <div>
                      <div className="sub" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Top rated right now</div>
                      <h3 style={{ marginTop: 4 }}>{top.project} <span className="muted" style={{ fontSize: 14 }}>${top.symbol}</span></h3>
                    </div>
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
                    <div style={{ font: '600 28px var(--display)', margin: '4px 0 10px' }}>${spotlight.score.lineUsd.toFixed(2)}</div>
                    <div className="sub">${Math.round(spotlight.score.monthlyCreatorUsd).toLocaleString('en-US')} monthly creator revenue</div>
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
                <div className="ic"><Icon name={x.icon} size={18} /></div>
                <h3>{x.title}</h3>
                <p>{x.body}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="lsection reveal">
          <div className="band" data-loop>
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
