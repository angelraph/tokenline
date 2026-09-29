'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { Avatar, Icon } from './ui';

export type CarItem = { mint: string; project: string; symbol: string; grade: string; score: number; lineUsd: number; monthlyCreatorUsd: number; volume24hUsd: number };

/** Arkham-style carousel of top rated agents with arrow controls and snap scrolling. */
export function TopCarousel({ items }: { items: CarItem[] }) {
  const track = useRef<HTMLDivElement>(null);
  const move = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  };

  return (
    <div className="carousel">
      <div className="lhead">
        <div>
          <div className="eyebrow">Trending on the board</div>
          <h2 style={{ marginTop: 8 }}>Top rated agents</h2>
        </div>
        <div className="car-btns">
          <button className="car-btn" aria-label="Previous" onClick={() => move(-1)}><Icon name="chevl" /></button>
          <button className="car-btn" aria-label="Next" onClick={() => move(1)}><Icon name="chevr" /></button>
        </div>
      </div>
      <div className="car-track" ref={track}>
        {items.map((r, i) => (
          <Link key={r.mint} href={`/agent/${r.mint}`} className="car-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar name={r.project} seed={r.mint} size={34} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.project}</div>
                <div className="sub">#{i + 1} · ${r.symbol}</div>
              </div>
              <span className={`grade g-${r.grade}`} style={{ marginLeft: 'auto' }}>{r.grade}</span>
            </div>
            <div style={{ font: '600 30px var(--display)' }}>{r.score}<span className="sub" style={{ fontSize: 13 }}> / 1000</span></div>
            <div className="row"><span className="l">Creator rev / mo</span><span className="r">${Math.round(r.monthlyCreatorUsd).toLocaleString()}</span></div>
            <div className="row"><span className="l">24h volume</span><span className="r">${Math.round(r.volume24hUsd).toLocaleString()}</span></div>
            <div className="row"><span className="l">Line</span><span className="r" style={{ color: 'var(--accent)' }}>${r.lineUsd.toFixed(2)}</span></div>
          </Link>
        ))}
      </div>
    </div>
  );
}
