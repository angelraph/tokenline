import type { ScoreResult } from './score';

export type Verdict = 'extend' | 'caution' | 'avoid';

/** Counterparty guidance for agents deciding whether to trade with or pay another agent. */
export function verdict(s: ScoreResult): { verdict: Verdict; reason: string } {
  if (s.grade === 'C') return { verdict: 'avoid', reason: 'no meaningful on-chain revenue history' };
  if (s.stale) return { verdict: 'avoid', reason: 'fees have stopped; the project may be abandoned' };
  if (['AAA', 'AA', 'A'].includes(s.grade)) return { verdict: 'extend', reason: 'consistent, recent creator-fee revenue' };
  return { verdict: 'caution', reason: 'revenue is real but thin or irregular; size exposure down' };
}
