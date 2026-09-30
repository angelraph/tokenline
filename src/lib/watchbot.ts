// Composes the daily Credit Watch thread for X. Pure and dependency-free so tests run the same code.

export type BotMove = {
  mint: string; project: string; xHandle: string | null;
  from: number; to: number; delta: number; gradeTo: string;
  lineFrom: number; lineTo: number;
  kind: 'upgrade' | 'downgrade' | 'newly_approved' | 'line_pulled';
};

export const MIN_WINDOW_MS = 12 * 3_600_000;
const LINK_LEN = 23; // X counts every link as 23 characters.
export const xLength = (s: string) => s.replace(/https?:\/\/\S+/g, 'x'.repeat(LINK_LEN)).length;

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const who = (m: BotMove) => (m.xHandle ? `@${m.xHandle.replace(/^@/, '')}` : m.project);

/** Hours covered, rounded to something a reader trusts ("24h", "9h"). */
export function windowLabel(since: number, now: number) {
  const h = Math.max(1, Math.round((now - since) / 3_600_000));
  return h >= 20 ? '24h' : `${h}h`;
}

/**
 * Header post plus one reply per positive move (upgrade or newly approved line), best first.
 * Downgrades and paused lines are counted in the header but never singled out by tag.
 */
export function composeDigest(moves: BotMove[], since: number, now: number, base: string, maxReplies = 4): string[] {
  // Post only with a real day of history and at least one agent to celebrate; /watch still lists everything.
  if (now - since < MIN_WINDOW_MS) return [];
  if (!moves.some((m) => m.kind === 'upgrade' || m.kind === 'newly_approved')) return [];
  const up = moves.filter((m) => m.kind === 'upgrade');
  const down = moves.filter((m) => m.kind === 'downgrade');
  const approved = moves.filter((m) => m.kind === 'newly_approved');
  const pulled = moves.filter((m) => m.kind === 'line_pulled');

  const tally = [
    up.length ? `▲ ${plural(up.length, 'upgrade', 'upgrades')}` : '',
    down.length ? `▼ ${plural(down.length, 'downgrade', 'downgrades')}` : '',
    approved.length ? `✓ ${plural(approved.length, 'new credit line', 'new credit lines')}` : '',
    pulled.length ? `${plural(pulled.length, 'line', 'lines')} paused` : '',
  ].filter(Boolean);

  const positive = [...approved, ...up].sort((a, b) => b.delta - a.delta || b.to - a.to);
  const lead = positive[0];
  const head = [
    `Tokenline Credit Watch, last ${windowLabel(since, now)}`,
    '',
    tally.join('\n'),
    ...(lead ? ['', `Top mover: ${who(lead)} ${lead.gradeTo} ${lead.to} (${signed(lead.delta)})`] : []),
    '',
    `Every Clawrena agent, re-rated hourly from on-chain fees: ${base}/watch`,
  ].join('\n');

  const replies = positive.slice(0, maxReplies).map((m) => {
    const line = m.lineTo > 0 ? ` Pre-approved for $${m.lineTo.toFixed(2)} of AI compute on credit.` : '';
    const text = m.kind === 'newly_approved'
      ? `✓ New credit line: ${who(m)} rates ${m.gradeTo}, ${m.to}/1000.${line}`
      : `▲ Upgrade: ${who(m)} moves to ${m.gradeTo}, ${m.to}/1000 (${signed(m.delta)}).${line}`;
    return `${text}\n\n${base}/agent/${m.mint}`;
  });

  return [head, ...replies].filter((p) => xLength(p) <= 280);
}
