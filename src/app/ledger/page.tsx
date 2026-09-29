import { poolStats } from '@/lib/board';
import { store } from '@/lib/store';
import { TxLink, txOf } from '../TxLink';

export const dynamic = 'force-dynamic';

const usd = (x: number) => `${x.toFixed(x > 0 && x < 1 ? 4 : 2)}`;
const short = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;

export default async function Ledger() {
  const [pool, events, agents] = await Promise.all([poolStats(), store.listEvents({ limit: 300 }), store.listAgents()]);
  const names = new Map(agents.map((a) => [a.id, a.name]));

  return (
    <main className="wrap">
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="eyebrow">Public ledger</div>
        <h1 style={{ fontSize: 40 }}>Every draw, repayment and collateral move.</h1>
        <p>Draws are metered at the proxy. Repayments, collateral and deposits are read straight from Solana; each links to its transaction.</p>
      </section>

      <div className="stats">
        <div className="stat"><div className="k">Outstanding</div><div className="v">{usd(pool.outstandingUsd)}</div></div>
        <div className="stat"><div className="k">Spread revenue</div><div className="v">{usd(pool.spreadRevenueUsd)}</div></div>
        <div className="stat"><div className="k">Backer deposits</div><div className="v">{usd(pool.depositsUsd)}</div></div>
        <div className="stat"><div className="k">Default rate</div><div className="v">{pool.defaultRate}%</div></div>
        <div className="stat"><div className="k">Draws</div><div className="v">{pool.draws}</div></div>
        <div className="stat"><div className="k">Last chain sync</div><div className="v" style={{ fontSize: 14 }}>{pool.lastSyncAt ? new Date(pool.lastSyncAt).toLocaleString() : 'n/a'}</div></div>
      </div>

      {(pool.poolWallet || pool.escrowWallet) && (
        <p className="sub">
          Pool: {pool.poolWallet && <a className="mono" href={`https://solscan.io/account/${pool.poolWallet}`} target="_blank" rel="noreferrer">{pool.poolWallet} ↗</a>}
          {pool.escrowWallet && pool.escrowWallet !== pool.poolWallet && <> · Escrow: <a className="mono" href={`https://solscan.io/account/${pool.escrowWallet}`} target="_blank" rel="noreferrer">{pool.escrowWallet} ↗</a></>}
        </p>
      )}

      <div className="table-wrap">
        <table>
          <thead><tr><th>When</th><th>Agent</th><th>Type</th><th className="hide-sm">Detail</th><th>Transaction</th><th className="num">USD</th></tr></thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td className="sub">{new Date(e.at).toLocaleString()}</td>
                <td>{e.agentId ? names.get(e.agentId) ?? short(e.agentId) : <span className="sub">{e.meta?.from ? short(String(e.meta.from)) : 'n/a'}</span>}</td>
                <td><span className="pill">{e.type}</span></td>
                <td className="sub hide-sm">
                  {e.type === 'draw' ? `${e.meta?.model} · ${Number(e.meta?.inputTokens) + Number(e.meta?.outputTokens)} tokens · ${e.meta?.x402Signature ? 'UsePod paid on-chain' : 'UsePod'}`
                    : e.amount ? `${e.amount} ${e.asset === 'SOL' ? 'SOL' : short(e.asset ?? '')}${e.meta?.from ? ` from ${short(String(e.meta.from))}` : ''}`
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
