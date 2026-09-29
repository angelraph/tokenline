'use client';

import { useState } from 'react';

/** Arkham-style uppercase tab panel. Panes are rendered on the server and passed in. */
export function Tabs({ panes, watermark }: { panes: { label: string; content: React.ReactNode }[]; watermark?: string }) {
  const [on, setOn] = useState(0);
  return (
    <div className="panel">
      {watermark && <div className="watermark">{watermark}</div>}
      <div className="ptabs" role="tablist">
        {panes.map((p, i) => (
          <button key={p.label} role="tab" aria-selected={on === i} className={`ptab${on === i ? ' on' : ''}`} onClick={() => setOn(i)}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="pbody" role="tabpanel">{panes[on]?.content}</div>
    </div>
  );
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button className="copy" aria-label={label} title={label}
      onClick={() => { navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1400); }).catch(() => undefined); }}>
      {done ? '✓' : '⧉'}
    </button>
  );
}
