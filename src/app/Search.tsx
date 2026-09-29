'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, Icon } from './ui';

type Row = { mint: string; project: string; symbol: string; grade: string; score: number };

let cache: Row[] | null = null;

/** Agent search with "/" and Ctrl/Cmd+K shortcuts, keyboard navigation and instant results. */
export function Search({ placeholder = 'Search agents, tickers or mints' }: { placeholder?: string }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(cache);
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);

  const load = () => {
    if (cache) return;
    fetch('/api/board').then((r) => r.json()).then((j) => {
      cache = (j.rows ?? []).map((r: Row) => ({ mint: r.mint, project: r.project, symbol: r.symbol, grade: r.grade, score: r.score }));
      setRows(cache);
    }).catch(() => setRows([]));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /input|textarea|select/i.test((e.target as HTMLElement)?.tagName ?? '');
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, []);

  const results = useMemo(() => {
    if (!rows) return null;
    const s = q.trim().toLowerCase();
    const list = s
      ? rows.filter((r) => r.project.toLowerCase().includes(s) || r.symbol.toLowerCase().includes(s) || r.mint.toLowerCase().startsWith(s))
      : rows;
    return list.slice(0, 8);
  }, [rows, q]);

  const go = (r: Row) => { setOpen(false); setQ(''); input.current?.blur(); router.push(`/agent/${r.mint}`); };

  return (
    <div className="search" ref={box}>
      <label className="search-box">
        <Icon name="search" />
        <input
          ref={input}
          value={q}
          placeholder={placeholder}
          aria-label="Search agents"
          onFocus={() => { setOpen(true); load(); }}
          onChange={(e) => { setQ(e.target.value); setSel(0); setOpen(true); }}
          onKeyDown={(e) => {
            if (!results?.length) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(results.length - 1, s + 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
            if (e.key === 'Enter') { e.preventDefault(); go(results[sel]); }
            if (e.key === 'Escape') { setOpen(false); input.current?.blur(); }
          }}
        />
        <span className="kbd">/</span>
      </label>
      {open && (
        <div className="search-pop" role="listbox">
          {results === null && [0, 1, 2, 3].map((i) => (
            <div key={i} className="search-item"><span className="sk" style={{ width: 26, height: 26, borderRadius: '50%' }} /><span className="sk" style={{ width: '50%', height: 12 }} /></div>
          ))}
          {results && results.length === 0 && <div className="search-empty">No agent matches &quot;{q}&quot;</div>}
          {results?.map((r, i) => (
            <div key={r.mint} role="option" aria-selected={i === sel} className={`search-item${i === sel ? ' on' : ''}`}
              onMouseEnter={() => setSel(i)} onMouseDown={(e) => { e.preventDefault(); go(r); }}>
              <Avatar name={r.project} seed={r.mint} />
              <span>{r.project} <span className="sub">${r.symbol}</span></span>
              <span className="kind"><span className={`grade g-${r.grade}`}>{r.grade}</span></span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
