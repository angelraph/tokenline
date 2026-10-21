'use client';

import { useState } from 'react';

type Drafts = { morning: string; midday: string; evening: string };
type Preview = { drafts: Drafts; posts: string[]; moves: number; since: string | null };

const SLOTS: { key: keyof Drafts; label: string }[] = [
  { key: 'morning', label: 'Morning: product' },
  { key: 'midday', label: 'Midday: live data' },
  { key: 'evening', label: 'Evening: build log or receipts' },
];

const intent = (text: string, replyTo?: string) =>
  `https://x.com/intent/post?text=${encodeURIComponent(text)}${replyTo ? `&in_reply_to=${replyTo}` : ''}`;

/** Today's Credit Watch thread, ready to post by hand from @tokenlinehq. */
export function BotDraft({ headers }: { headers: () => Record<string, string> }) {
  const [data, setData] = useState<Preview | null>(null);
  const [err, setErr] = useState('');
  const [first, setFirst] = useState('');
  const [copied, setCopied] = useState<number | null>(null);

  async function load() {
    setErr('');
    const r = await fetch('/api/bot/watch?preview=1', { headers: headers() });
    const j = await r.json();
    if (!r.ok) return setErr(j.error);
    setData(j);
  }

  async function copy(i: number, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(i);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setErr('Copy failed: select the text and copy it by hand.');
    }
  }

  const replyTo = first.match(/status\/(\d+)/)?.[1];

  return (
    <div className="section">
      <div className="section-head"><div><h2>Today&apos;s posts</h2>
        <p>Three posts for @tokenlinehq, written from live numbers: morning, midday and evening. On days with upgrades the Credit Watch thread appears below them.</p></div></div>
      <button className="btn" onClick={load}>{data ? 'Refresh' : 'Load today’s posts'}</button>
      {err && <div className="callout warn" style={{ marginTop: 12 }}>{err}</div>}
      {data?.drafts && (
        <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
          {SLOTS.map((slot, n) => (
            <div className="card" key={slot.key}>
              <div className="sub" style={{ marginBottom: 8 }}>{slot.label} · new every day, live numbers</div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.55, overflowWrap: 'anywhere' }}>{data.drafts[slot.key]}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button className="btn sm" onClick={() => copy(-1 - n, data.drafts[slot.key])}>{copied === -1 - n ? 'Copied' : 'Copy'}</button>
                <a className="btn primary sm" href={intent(data.drafts[slot.key])} target="_blank" rel="noreferrer">Open in X</a>
              </div>
            </div>
          ))}
        </div>
      )}
      {data && !data.posts.length && (
        <p className="sub" style={{ marginTop: 12 }}>
          No Credit Watch thread today. It appears once there are 12 hours of score history and at least one upgrade or new
          credit line ({data.moves} rating {data.moves === 1 ? 'move' : 'moves'} so far). The three posts above are ready every day.
        </p>
      )}
      {data && data.posts.length > 0 && (
        <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
          {data.posts.map((p, i) => (
            <div className="card" key={i}>
              <div className="sub" style={{ marginBottom: 8 }}>{i === 0 ? 'Post 1 (starts the thread)' : `Reply ${i}`}</div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.55, overflowWrap: 'anywhere' }}>{p}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <button className="btn sm" onClick={() => copy(i, p)}>{copied === i ? 'Copied' : 'Copy'}</button>
                {i === 0
                  ? <a className="btn primary sm" href={intent(p)} target="_blank" rel="noreferrer">Open in X</a>
                  : replyTo
                    ? <a className="btn primary sm" href={intent(p, replyTo)} target="_blank" rel="noreferrer">Reply on X</a>
                    : <span className="sub" style={{ alignSelf: 'center' }}>Paste the link of post 1 above to reply</span>}
              </div>
              {i === 0 && (
                <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
                  <label>Link to post 1 after you publish it</label>
                  <input className="input" value={first} onChange={(e) => setFirst(e.target.value)} placeholder="https://x.com/tokenlinehq/status/..." />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
