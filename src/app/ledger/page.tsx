import { poolStats } from '@/lib/board';
import { config } from '@/lib/config';
import { store } from '@/lib/store';
import { TxLink, txOf } from '../TxLink';

export const dynamic = 'force-dynamic';

const usd = (x: number) => `${x.toFixed(x > 0 && x < 1 ? 4 : 2)}`;
const short = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;
const symbol = (mint: string) =>
  mint === 'SOL' ? 'SOL' : mint === config.mints.tline ? '$TOKENL' : mint === config.mints.ansem ? '$ANSEM' : mint === config.mints.usdc ? 'USDC' : short(mint);
const qty = (x: number) => x.toLocaleString('en-US', { maximumFractionDigits: x < 1 ? 6 : 2 });

export default async function Ledger() {
  const [pool, events, agents] = await Promise.all([poolStats(), store.listEvents({ limit: 300 }), store.listAgents()]);
  const names = new Map(agents.map((a) => [a.id, a.name]));

  return (
    <main className="wrap">
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="eyebrow">Public ledger</div>
        <h1 style={{ fontSize: 40 }}>Every draw, repayment and collateral move.</h1>
        <p>Draws are metered at the proxy. Repayments, collateral, deposits and buybacks are read straight from Solana; each links to its transaction.</p>
      </section>

      <div className="stats">
        <div className="stat"><div className="k">Outstanding</div><div className="v">{usd(pool.outstandingUsd)}</div></div>
        <div className="stat"><div className="k">Spread revenue</div><div className="v">{usd(pool.spreadRevenueUsd)}</div></div>
        <div className="stat"><div className="k">Backer deposits</div><div className="v">{usd(pool.depositsUsd)}</div></div>
        <div className="stat"><div className="k">Default rate</div><div className="v">{pool.defaultRate}%</div></div>
        <div className="stat"><div className="k">Draws</div><div className="v">{pool.draws}</div></div>
        <div className="stat"><div className="k">Last chain sync</div><div className="v" style={{ fontSize: 14 }}>{pool.lastSyncAt ? new Date(pool.lastSyncAt).toLocaleString() : 'n/a'}</div></div>
      </div>

      <div className="panel" style={{ margin: '8px 0 18px' }}>
        <div className="ptabs"><span className="ptab on">Flywheel</span></div>
        <div className="pbody">
          <p className="sub" style={{ marginTop: 0 }}>
            {Math.round(pool.buybackShare * 100)}% of what the desk earns (draw spread plus paid reports) is committed to buying $TOKENL and $ANSEM
            on the open market. Buybacks are swaps signed by the pool wallet; the chain sync detects them and books them here automatically.
          </p>
          <div className="kv">
            <div className="kv-row"><span>Desk revenue</span><span className="r">${usd(pool.revenueUsd)}</span></div>
            <div className="kv-row"><span>Buyback commitment ({Math.round(pool.buybackShare * 100)}%)</span><span className="r">${usd(pool.buybackTargetUsd)}</span></div>
            <div className="kv-row"><span>Bought back on-chain</span><span className="r">${usd(pool.buybackUsd)}</span></div>
            {Object.entries(pool.bought).map(([mint, amount]) => (
              <div className="kv-row" key={mint}><span>{symbol(mint)} bought</span><span className="r">{qty(amount)}</span></div>
            ))}
          </div>
          {pool.buybackTargetUsd > 0 && (
            <div className="bar" style={{ marginTop: 12 }} aria-label="Buyback commitment met">
              <span style={{ width: `${Math.min(100, (pool.buybackUsd / pool.buybackTargetUsd) * 100)}%` }} />
            </div>
          )}
          {pool.buybacks.length > 0 ? (
            <div className="sub" style={{ marginTop: 12 }}>
              {pool.buybacks.map((b) => (
                <div key={b.signature + b.asset} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '4px 0' }}>
                  <span>{new Date(b.at).toLocaleDateString()}</span>
                  <span>{qty(b.amount)} {symbol(b.asset)} (${usd(b.usd)})</span>
                  <TxLink sig={b.signature || null} />
                </div>
              ))}
            </div>
          ) : (
            <p className="sub" style={{ marginBottom: 0 }}>No buyback yet. The first one will appear here with its transaction.</p>
          )}
          <p className="sub" style={{ marginBottom: 0 }}>
            Holding {config.policy.holderMin.toLocaleString('en-US')}+ $TOKENL in the agent wallet raises the unsecured line by {Math.round(config.policy.holderBoost * 100)}%
            and lowers the spread from {config.policy.spreadBps / 100}% to {config.policy.holderSpreadBps / 100}%.
          </p>
        </div>
      </div>

      {(pool.poolWallet || pool.escrowWallet) && (
        <p className="sub">
          Pool: {pool.poolWallet && <a className="mono" href={`https://solscan.io/account/${pool.poolWallet}`} target="_blank" rel="noreferrer">{pool.poolWallet} ↗</a>}
          {pool.escrowWallet && pool.escrowWallet !== pool.poolWallet && <> · Escrow: <a className="mono" href={`https://solscan.io/account/${pool.escrowWallet}`} target="_blank" rel="noreferrer">{pool.escrowWallet} ↗</a></>}
        </p>
      )}

      <div className="table-wrap">
        <table>
          <thead><tr><th>When</th><th className="hide-sm">Agent</th><th>Type</th><th className="hide-sm">Detail</th><th>Transaction</th><th className="num">USD</th></tr></thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td className="sub">{new Date(e.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
                <td className="hide-sm">{e.agentId ? names.get(e.agentId) ?? short(e.agentId) : <span className="sub">{e.type === 'buyback' ? 'Pool' : e.meta?.from ? short(String(e.meta.from)) : 'n/a'}</span>}</td>
                <td><span className="pill">{e.type}</span></td>
                <td className="sub hide-sm">
                  {e.type === 'draw' ? `${e.meta?.model} · ${Number(e.meta?.inputTokens) + Number(e.meta?.outputTokens)} tokens · ${e.meta?.x402Signature ? 'UsePod paid on-chain' : 'UsePod'}`
                    : e.type === 'buyback' ? `bought ${qty(Number(e.amount))} ${symbol(e.asset ?? '')} on the market`
                    : e.amount ? `${e.amount} ${symbol(e.asset ?? '')}${e.meta?.from ? ` from ${short(String(e.meta.from))}` : ''}`
                    : e.meta?.action ? String(e.meta.action) : ''}
                </td>
                <td><TxLink sig={txOf(e)} /></td>
                <td className="num">{e.amountUsd ? `$${e.amountUsd.toFixed(e.type === 'draw' ? 5 : 2)}` : 'n/a'}</td>
              </tr>
            ))}
            {!events.length && <tr><td colSpan={6} className="sub">The ledger is empty. The first line opens soon.</td></tr>}
          </tbody>
        </table>
      </div>
    </main>
  );
}
