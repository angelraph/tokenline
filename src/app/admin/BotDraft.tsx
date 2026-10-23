'use client';

import { useEffect, useState } from 'react';

type Drafts = { morning: string; midday: string; evening: string; receipt: string | null; announcement: string | null };
type Day = { date: string; savedAt: string; posts: Record<string, string> };
type Preview = { drafts: Drafts; archive: Day[]; posts: string[]; moves: number; since: string | null };

const SLOTS: { key: keyof Drafts; label: string }[] = [
  { key: 'receipt', label: 'Buyback receipt: a buyback just landed' },
  { key: 'announcement', label: 'Buyback rule: post once and pin it' },
  { key: 'morning', label: 'Morning: product' },
  { key: 'midday', label: 'Midday: live data' },
  { key: 'evening', label: 'Evening: build log or receipts' },
];

const intent = (text: string, replyTo?: string) =>
  `https://x.com/intent/post?text=${encodeURIComponent(text)}${replyTo ? `&in_reply_to=${replyTo}` : ''}`;

const dayLabel = (date: string, today: string) => {
  const nice = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
  const diff = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86_400_000);
  return diff === 0 ? `Today · ${nice}` : diff === 1 ? `Yesterday · ${nice}` : nice;
};

/** Posts for @tokenlinehq: today's set (live numbers) and the days before, ready to copy or open in X. */
export function BotDraft({ headers }: { headers: () => Record<string, string> }) {
  const [data, setData] = useState<Preview | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [first, setFirst] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  async function load() {
    setErr(''); setBusy(true);
    try {
      const r = await fetch('/api/bot/watch?preview=1', { headers: headers() });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setData(j);
    } catch (e) {
      setErr((e as Error).message);
    } finally { setBusy(false); }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setErr('Copy failed: select the text and copy it by hand.');
    }
  }

  const card = (id: string, label: string, text: string) => (
    <div className="card" key={id}>
      <div className="sub" style={{ marginBottom: 8 }}>{label}</div>
      <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.55, overflowWrap: 'anywhere' }}>{text}</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button className="btn sm" onClick={() => copy(id, text)}>{copied === id ? 'Copied' : 'Copy'}</button>
        <a className="btn primary sm" href={intent(text)} target="_blank" rel="noreferrer">Open in X</a>
      </div>
    </div>
  );

  const today = new Date().toISOString().slice(0, 10);
  const past = (data?.archive ?? []).filter((d) => d.date < today);
  const replyTo = first.match(/status\/(\d+)/)?.[1];

  return (
    <div className="section">
      <div className="section-head"><div><h2>Posts</h2>
        <p>Written for @tokenlinehq from live numbers. Today&apos;s set refreshes through the day; at midnight UTC it moves to yesterday and a new set starts.</p></div></div>
      <button className="btn" onClick={load} disabled={busy}>{busy ? 'Loading...' : 'Refresh'}</button>
      {err && <div className="callout warn" style={{ marginTop: 12 }}>{err}</div>}

      {data?.drafts && (
        <>
          <h3 style={{ margin: '20px 0 10px' }}>{dayLabel(today, today)}</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {SLOTS.filter((s) => data.drafts[s.key]).map((s) => card(`today-${s.key}`, s.label, data.drafts[s.key] ?? ''))}
          </div>
        </>
      )}

      {data && data.posts.length > 0 && (
        <>
          <h3 style={{ margin: '20px 0 10px' }}>Credit Watch thread</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            {data.posts.map((p, i) => (
              <div className="card" key={i}>
                <div className="sub" style={{ marginBottom: 8 }}>{i === 0 ? 'Post 1 (starts the thread)' : `Reply ${i}`}</div>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.55, overflowWrap: 'anywhere' }}>{p}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <button className="btn sm" onClick={() => copy(`t${i}`, p)}>{copied === `t${i}` ? 'Copied' : 'Copy'}</button>
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
        </>
      )}

      {past.length > 0 && (
        <>
          <h3 style={{ margin: '28px 0 10px' }}>Earlier days</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {past.map((d) => (
              <div key={d.date} className="card" style={{ padding: 0 }}>
                <button className="btn" style={{ width: '100%', justifyContent: 'space-between', border: 0 }} onClick={() => setOpen(open === d.date ? null : d.date)}>
                  <span>{dayLabel(d.date, today)}</span>
                  <span className="sub">{Object.keys(d.posts).length} posts {open === d.date ? '▲' : '▼'}</span>
                </button>
                {open === d.date && (
                  <div style={{ display: 'grid', gap: 12, padding: 14 }}>
                    {SLOTS.filter((s) => d.posts[s.key]).map((s) => card(`${d.date}-${s.key}`, s.label, d.posts[s.key]))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
