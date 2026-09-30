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

const who = (m: BotMove) => (m.xHandle ? `@${m.xHandle.replace(/^@/, '')}` : m.project);

/** Hours covered, rounded to something a reader trusts ("24h", "9h"). */
export function windowLabel(since: number, now: number) {
  const h = Math.max(1, Math.round((now - since) / 3_600_000));
  return h >= 20 ? '24h' : `${h}h`;
}

const words = (n: number) => ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][n] ?? String(n);

/** Deterministic pick: the same day always reads the same, different days read differently. */
const pick = <T,>(options: T[], seed: number) => options[Math.abs(seed) % options.length];

/** "Two agents moved up, one got its first credit line and one slipped." */
function summary(up: number, down: number, approved: number, paused: number) {
  const parts = [
    up ? `${words(up)} ${up === 1 ? 'agent' : 'agents'} moved up` : '',
    approved ? `${words(approved)} got ${approved === 1 ? 'its' : 'their'} first credit line` : '',
    down ? `${words(down)} slipped` : '',
    paused ? `${words(paused)} had ${paused === 1 ? 'its line' : 'their lines'} paused` : '',
  ].filter(Boolean);
  const text = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

/**
 * Header post plus one reply per positive move (upgrade or newly approved line), best first.
 * Downgrades and paused lines are counted in the header but never singled out by tag.
 * Wording rotates by day so the feed reads like a person keeping an eye on the board.
 */
export function composeDigest(moves: BotMove[], since: number, now: number, base: string, maxReplies = 4): string[] {
  // Post only with a real day of history and at least one agent to celebrate; /watch still lists everything.
  if (now - since < MIN_WINDOW_MS) return [];
  if (!moves.some((m) => m.kind === 'upgrade' || m.kind === 'newly_approved')) return [];
  const up = moves.filter((m) => m.kind === 'upgrade');
  const down = moves.filter((m) => m.kind === 'downgrade');
  const approved = moves.filter((m) => m.kind === 'newly_approved');
  const pulled = moves.filter((m) => m.kind === 'line_pulled');
  const day = Math.floor(now / 86_400_000);
  const today = windowLabel(since, now) === '24h';
  const span = today ? 'today' : `over the last ${Math.round((now - since) / 3_600_000)} hours`;

  const positive = [...approved, ...up].sort((a, b) => b.delta - a.delta || b.to - a.to);
  const lead = positive[0];
  const opener = pick([
    `Credit moves across Clawrena ${span}.`,
    `Went through the Credit Board ${today ? 'this morning' : span}.`,
    `Here's who moved on the Credit Board ${span}.`,
    `Daily look at the Clawrena ratings.`,
  ], day);
  const leadLine = lead.kind === 'newly_approved'
    ? `Biggest story: ${who(lead)} qualified for a credit line at ${lead.gradeTo} (${lead.to}).`
    : `Biggest jump: ${who(lead)}, now ${lead.gradeTo} at ${lead.to}, up ${lead.delta} points.`;
  const head = [
    opener,
    '',
    summary(up.length, down.length, approved.length, pulled.length),
    '',
    leadLine,
    '',
    `Full list, re-rated hourly from on-chain fees: ${base}/watch`,
  ].join('\n');

  const replies = positive.slice(0, maxReplies).map((m, i) => {
    const line = `$${m.lineTo.toFixed(2)}`;
    const hasLine = m.lineTo > 0;
    const seed = day + i;
    const text = m.kind === 'newly_approved'
      ? pick([
          `First credit line for ${who(m)}. They rate ${m.gradeTo} at ${m.to}, which unlocks ${line} of compute on credit.`,
          `${who(m)} just qualified: ${m.gradeTo}, ${m.to} out of 1000, with ${line} of compute ready on credit.`,
          `New line open for ${who(m)}. ${m.gradeTo} at ${m.to}, good for ${line} of AI compute on credit.`,
        ], seed)
      : pick([
          `${who(m)} climbed to ${m.gradeTo} ${span}, ${m.to} out of 1000 (up ${m.delta}).${hasLine ? ` Their line sits at ${line} if they want it.` : ''}`,
          `Nice move from ${who(m)}: now ${m.gradeTo} at ${m.to}, up ${m.delta} points.${hasLine ? ` ${line} of compute is ready on credit.` : ''}`,
          `${who(m)} is up ${m.delta} points to ${m.to} (${m.gradeTo}).${hasLine ? ` Pre-approved line: ${line}.` : ''}`,
        ], seed);
    return `${text}\n\n${base}/agent/${m.mint}`;
  });

  return [head, ...replies].filter((p) => xLength(p) <= 280);
}
