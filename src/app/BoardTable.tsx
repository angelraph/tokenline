'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { BoardRow } from '@/lib/board';

const ago = (iso: string | null) => {
  if (!iso) return 'n/a';
  const h = (Date.now() - Date.parse(iso)) / 3_600_000;
  return h < 1 ? `${Math.max(1, Math.round(h * 60))}m` : h < 48 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`;
};

export function BoardTable({ rows }: { rows: BoardRow[] }) {
  const [q, setQ] = useState('');
  const [onlyApproved, setOnlyApproved] = useState(false);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) =>
      (!onlyApproved || r.lineUsd > 0) &&
      (!s || r.project.toLowerCase().includes(s) || r.symbol.toLowerCase().includes(s) || r.mint.startsWith(q.trim())));
  }, [rows, q, onlyApproved]);

  return (
    <>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input" style={{ maxWidth: 320 }} placeholder="Search project, $ticker or mint" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="muted" style={{ fontSize: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={onlyApproved} onChange={(e) => setOnlyApproved(e.target.checked)} /> pre-approved only
        </label>
        <span className="sub">{shown.length} of {rows.length}</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Project</th><th>Grade</th><th className="num hide-sm">Score</th><th className="num">Pre-approved line</th>
              <th className="num hide-sm">Creator rev / mo</th><th className="num hide-sm">24h vol</th><th className="num hide-sm">Last fee</th><th className="hide-sm">Tokenline</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.mint}>
                <td className="sub">{r.rank}</td>
                <td>
                  <Link href={`/agent/${r.mint}`}><strong>{r.project}</strong></Link>{' '}
                  <span className="sub">${r.symbol}</span>
                </td>
                <td><span className={`grade g-${r.grade}`}>{r.grade}</span></td>
                <td className="num hide-sm">{r.score}</td>
                <td className="num">{r.lineUsd > 0 ? `$${r.lineUsd.toFixed(2)}` : <span className="sub">{r.stale ? 'dormant' : 'n/a'}</span>}</td>
                <td className="num hide-sm">${Math.round(r.monthlyCreatorUsd).toLocaleString()}</td>
                <td className="num hide-sm">${Math.round(r.volume24hUsd).toLocaleString()}</td>
                <td className="num hide-sm">{ago(r.lastFeeAt)}</td>
                <td className="hide-sm">
                  {r.onTokenline
                    ? <span className={`pill ${r.verified ? 'live' : 'warn'}`}><span className="dot" />{r.verified ? `open · $${r.outstandingUsd} out` : 'verifying'}</span>
                    : r.lineUsd > 0 ? <Link className="sub" href={`/apply?mint=${r.mint}`}>claim →</Link> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
