import type { BoardRow } from './board';
import { store } from './store';

// Credit Watch: hourly score snapshots of every Clawrena entry, so upgrades,
// downgrades and agents going dormant show up the moment they happen.

type Snapshot = { at: number; s: Record<string, [number, number]> }; // mint -> [score, lineUsd]

const KEY = 'watch:snapshots';
const EVERY_MS = 3_600_000;
const KEEP_MS = 8 * 86_400_000;

export async function recordSnapshot(rows: BoardRow[]) {
  const snaps = (await store.getKv<Snapshot[]>(KEY)) ?? [];
  const last = snaps[snaps.length - 1];
  if (last && Date.now() - last.at < EVERY_MS) return;
  const s: Snapshot['s'] = {};
  for (const r of rows) s[r.mint] = [r.score, r.lineUsd];
  const kept = snaps.filter((x) => Date.now() - x.at < KEEP_MS);
  kept.push({ at: Date.now(), s });
  await store.setKv(KEY, kept);
}

export type Move = {
  mint: string; project: string; symbol: string;
  from: number; to: number; delta: number; gradeTo: string;
  lineFrom: number; lineTo: number;
  kind: 'upgrade' | 'downgrade' | 'newly_approved' | 'line_pulled';
};

/** Compare the live board with the snapshot closest to `hours` ago. */
export async function movers(rows: BoardRow[], hours = 24) {
  const snaps = (await store.getKv<Snapshot[]>(KEY)) ?? [];
  if (!snaps.length) return { since: null as number | null, moves: [] as Move[] };
  const target = Date.now() - hours * 3_600_000;
  const base = snaps.reduce((best, x) => (Math.abs(x.at - target) < Math.abs(best.at - target) ? x : best), snaps[0]);
  const moves: Move[] = [];
  for (const r of rows) {
    const prev = base.s[r.mint];
    if (!prev) continue;
    const [from, lineFrom] = prev;
    const delta = r.score - from;
    const kind: Move['kind'] | null =
      lineFrom === 0 && r.lineUsd > 0 ? 'newly_approved'
      : lineFrom > 0 && r.lineUsd === 0 ? 'line_pulled'
      : delta >= 25 ? 'upgrade'
      : delta <= -25 ? 'downgrade'
      : null;
    if (kind) moves.push({ mint: r.mint, project: r.project, symbol: r.symbol, from, to: r.score, delta, gradeTo: r.grade, lineFrom, lineTo: r.lineUsd, kind });
  }
  moves.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return { since: base.at, moves };
}
