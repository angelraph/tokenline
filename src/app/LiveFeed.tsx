'use client';

import { useEffect, useRef, useState } from 'react';
import { TxLink, txOf } from './TxLink';

export type FeedEvent = {
  id: string; type: string; agent: string | null; amountUsd: number; asset: string | null; amount: number | null;
  txSig: string | null; meta: Record<string, unknown> | null; at: string;
};

const LABEL: Record<string, string> = {
  draw: 'AI call', repay: 'Repayment', collateral: 'Collateral', collateral_release: 'Release', deposit: 'Deposit',
  sale: 'Report sale', apply: 'New line', verify: 'Verified', freeze: 'Frozen', unfreeze: 'Unfrozen',
};

function ago(iso: string, now: number) {
  const s = Math.max(0, (now - Date.parse(iso)) / 1000);
  if (s < 60) return 'Now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86_400)}d ago`;
}

function detail(e: FeedEvent) {
  if (e.type === 'draw') return `${e.meta?.model ?? 'model'} · ${Number(e.meta?.inputTokens ?? 0) + Number(e.meta?.outputTokens ?? 0)} tokens`;
  if (e.amount) return `${e.amount} ${e.asset === 'SOL' ? 'SOL' : e.asset?.startsWith('9cRCn9') ? 'ANSEM' : 'tokens'}`;
  return '';
}

/** Arkham-style live ledger: polls every few seconds and slides new rows in. */
export function LiveFeed({ initial, serverNow }: { initial: FeedEvent[]; serverNow: number }) {
  const [events, setEvents] = useState(initial);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  // Start from the server's clock so the first client render matches the HTML exactly.
  const [now, setNow] = useState(serverNow);
  const known = useRef(new Set(initial.map((e) => e.id)));

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch('/api/ledger?limit=8', { cache: 'no-store' });
        const j = await r.json();
        if (stop || !Array.isArray(j.events)) return;
        const incoming = (j.events as FeedEvent[]).filter((e) => !known.current.has(e.id));
        incoming.forEach((e) => known.current.add(e.id));
        if (incoming.length) setFresh(new Set(incoming.map((e) => e.id)));
        setEvents(j.events);
      } catch { /* keep the last good list */ }
      setNow(Date.now());
    };
    setNow(Date.now());
    const t = setInterval(tick, 8000);
    return () => { stop = true; clearInterval(t); };
  }, []);

  return (
    <div className="feed">
      <div className="watermark">Tokenline</div>
      <div className="feed-head"><span>Time</span><span>Type</span><span>Agent</span><span>Detail</span><span>Transaction</span><span style={{ textAlign: 'right' }}>USD</span></div>
      {events.length === 0 && <div className="feed-empty">The ledger is quiet. The next draw lands here in real time.</div>}
      {events.map((e) => (
        <div key={e.id} className={`feed-row${fresh.has(e.id) ? ' fresh' : ''}`}>
          <span className="when">{ago(e.at, now)}</span>
          <span className="c-type"><span className="pill">{LABEL[e.type] ?? e.type}</span></span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.agent ?? 'Pool'}</span>
          <span className="c-detail sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail(e)}</span>
          <span className="hide-sm"><TxLink sig={txOf(e)} /></span>
          <span className="amt">{e.amountUsd ? `$${e.amountUsd.toFixed(e.amountUsd < 1 ? 4 : 2)}` : 'n/a'}</span>
        </div>
      ))}
    </div>
  );
}
