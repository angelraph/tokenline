'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { BoardRow } from '@/lib/board';
import { Avatar, Icon } from './ui';

type SortKey = 'rank' | 'score' | 'lineUsd' | 'monthlyCreatorUsd' | 'volume24hUsd' | 'change';
const GRADES = ['All', 'AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'C'];
const STAR_KEY = 'tokenline.watchlist';

const ago = (iso: string | null, now: number) => {
  if (!iso) return 'never';
  const h = (now - Date.parse(iso)) / 3_600_000;
  return h < 1 ? `${Math.max(1, Math.round(h * 60))}m` : h < 48 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`;
};

/** DefiLlama-style ratings table: grade pills, search, watchlist, sortable columns, CSV export. */
export function BoardTable({ rows, deltas = {}, hasHistory = false }: { rows: BoardRow[]; deltas?: Record<string, number>; hasHistory?: boolean }) {
  const [q, setQ] = useState('');
  const [grade, setGrade] = useState('All');
  const [onlyApproved, setOnlyApproved] = useState(false);
  const [onlyStarred, setOnlyStarred] = useState(false);
  const [stars, setStars] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'rank', dir: 1 });
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    try { setStars(new Set(JSON.parse(localStorage.getItem(STAR_KEY) ?? '[]'))); } catch { /* storage blocked */ }
  }, []);

  const toggleStar = (mint: string) => {
    setStars((prev) => {
      const next = new Set(prev);
      if (next.has(mint)) next.delete(mint); else next.add(mint);
      try { localStorage.setItem(STAR_KEY, JSON.stringify([...next])); } catch { /* storage blocked */ }
      return next;
    });
  };

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = rows.filter((r) =>
      (grade === 'All' || r.grade === grade) &&
      (!onlyApproved || r.lineUsd > 0) &&
      (!onlyStarred || stars.has(r.mint)) &&
      (!s || r.project.toLowerCase().includes(s) || r.symbol.toLowerCase().includes(s) || r.mint.toLowerCase().startsWith(s)));
    const val = (r: BoardRow) => (sort.key === 'change' ? deltas[r.mint] ?? 0 : r[sort.key]);
    return [...list].sort((a, b) => (val(a) - val(b)) * sort.dir);
  }, [rows, q, grade, onlyApproved, onlyStarred, stars, sort, deltas]);

  const sortBy = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === 'rank' ? 1 : -1 }));
  const arrow = (key: SortKey) => (sort.key === key ? (sort.dir === 1 ? ' ↑' : ' ↓') : '');

  const exportCsv = () => {
    const head = ['rank', 'project', 'symbol', 'mint', 'grade', 'score', 'line_usd', 'creator_revenue_month_usd', 'volume_24h_usd', 'last_fee_at'];
    const lines = shown.map((r) => [r.rank, `"${r.project.replace(/"/g, '""')}"`, r.symbol, r.mint, r.grade, r.score, r.lineUsd, Math.round(r.monthlyCreatorUsd), Math.round(r.volume24hUsd), r.lastFeeAt ?? ''].join(','));
    const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tokenline-credit-board.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="section" style={{ marginTop: 22 }}>
      <div className="fpills" role="group" aria-label="Filter by grade">
        {GRADES.map((g) => (
          <button key={g} className={`fp${grade === g ? ' on' : ''}`} onClick={() => setGrade(g)}>
            {g}{g !== 'All' ? ` · ${rows.filter((r) => r.grade === g).length}` : ''}
          </button>
        ))}
      </div>
      <div className="toolbar">
        <input className="input" style={{ maxWidth: 300 }} placeholder="Filter by name, ticker or mint" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className={`fp${onlyApproved ? ' on' : ''}`} onClick={() => setOnlyApproved((v) => !v)}>Pre-approved</button>
        <button className={`fp${onlyStarred ? ' on' : ''}`} onClick={() => setOnlyStarred((v) => !v)}>★ Watchlist{stars.size ? ` · ${stars.size}` : ''}</button>
        <span className="grow" />
        <span className="sub">{shown.length} of {rows.length}</span>
        <button className="btn sm" onClick={exportCsv}><Icon name="download" size={14} /> .csv</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 34 }} aria-label="Watchlist" />
              <th className="sortable" onClick={() => sortBy('rank')}>#{arrow('rank')}</th>
              <th>Agent</th>
              <th>Grade</th>
              <th className="num sortable" onClick={() => sortBy('score')}>Score{arrow('score')}</th>
              <th className="num sortable hide-sm" onClick={() => sortBy('change')}>24h{arrow('change')}</th>
              <th className="num sortable" onClick={() => sortBy('lineUsd')}>Line{arrow('lineUsd')}</th>
              <th className="num sortable hide-sm" onClick={() => sortBy('monthlyCreatorUsd')}>Creator rev / mo{arrow('monthlyCreatorUsd')}</th>
              <th className="num sortable hide-sm" onClick={() => sortBy('volume24hUsd')}>24h vol{arrow('volume24hUsd')}</th>
              <th className="num hide-sm">Last fee</th>
              <th className="hide-sm">Tokenline</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const dlt = deltas[r.mint];
              return (
                <tr key={r.mint}>
                  <td><button className={`star${stars.has(r.mint) ? ' on' : ''}`} aria-label={stars.has(r.mint) ? 'Remove from watchlist' : 'Add to watchlist'} onClick={() => toggleStar(r.mint)}>{stars.has(r.mint) ? '★' : '☆'}</button></td>
                  <td className="sub">{r.rank}</td>
                  <td>
                    <Link href={`/agent/${r.mint}`} className="cell-name">
                      <Avatar name={r.project} seed={r.mint} />
                      <span><strong>{r.project}</strong> <span className="sub">${r.symbol}</span></span>
                    </Link>
                  </td>
                  <td><span className={`grade g-${r.grade}`}>{r.grade}</span></td>
                  <td className="num">{r.score}</td>
                  <td className="num hide-sm">
                    {!hasHistory || dlt === undefined ? <span className="chg flat">n/a</span>
                      : dlt === 0 ? <span className="chg flat">0</span>
                      : <span className={`chg ${dlt > 0 ? 'up' : 'down'}`}>{dlt > 0 ? '+' : ''}{dlt}</span>}
                  </td>
                  <td className="num">{r.lineUsd > 0 ? <span style={{ color: 'var(--accent)' }}>${r.lineUsd.toFixed(2)}</span> : <span className="sub">{r.stale ? 'dormant' : 'n/a'}</span>}</td>
                  <td className="num hide-sm">${Math.round(r.monthlyCreatorUsd).toLocaleString('en-US')}</td>
                  <td className="num hide-sm">${Math.round(r.volume24hUsd).toLocaleString('en-US')}</td>
                  <td className="num hide-sm">{now === null ? '' : ago(r.lastFeeAt, now)}</td>
                  <td className="hide-sm">
                    {r.onTokenline
                      ? <span className={`pill ${r.verified ? 'live' : 'warn'}`}><span className="dot" />{r.verified ? 'line open' : 'verifying'}</span>
                      : r.lineUsd > 0 ? <Link className="pill blue" href={`/apply?mint=${r.mint}`}>claim line</Link> : null}
                  </td>
                </tr>
              );
            })}
            {!shown.length && <tr><td colSpan={11} className="sub" style={{ textAlign: 'center', padding: 28 }}>No agents match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
