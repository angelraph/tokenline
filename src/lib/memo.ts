import { config } from './config';
import type { ClawrenaProject } from './clawrena';
import type { ScoreResult } from './score';
import { store } from './store';
import { usepodPost, upstreamMode } from './usepod';

const TTL = 6 * 3_600_000;

function fallback(p: ClawrenaProject, s: ScoreResult) {
  const strongest = [...s.components].sort((a, b) => b.points / (b.max || 1) - a.points / (a.max || 1))[0];
  const weakest = [...s.components].filter((c) => c.max > 0).sort((a, b) => a.points / a.max - b.points / b.max)[0];
  return `${p.projectName} ($${p.symbol}) grades ${s.grade} (${s.score}/1000). ` +
    `Strongest signal: ${strongest.label.toLowerCase()}: ${strongest.detail}. ` +
    `Main risk: ${weakest.label.toLowerCase()}: ${weakest.detail}. ` +
    (s.lineUsd > 0 ? `Pre-approved for $${s.lineUsd} of compute on verification.` : 'No unsecured line; collateral-backed credit only.');
}

/**
 * A short analyst-style credit memo. Written by an LLM bought on UsePod, so every
 * memo is itself inference Tokenline routes. Cached per mint for 6 hours.
 */
export async function creditMemo(p: ClawrenaProject, s: ScoreResult, opts: { llm?: boolean } = {}): Promise<{ text: string; source: 'usepod' | 'rules' }> {
  const key = `memo:${p.mint}:${s.grade}`;
  const hit = await store.getKv<{ text: string; at: number; source: 'usepod' | 'rules' }>(key);
  if (hit && Date.now() - hit.at < TTL && (hit.source === 'usepod' || !opts.llm)) return hit;

  let text = fallback(p, s), source: 'usepod' | 'rules' = 'rules';
  // LLM memos cost real inference, so they are written only for agents with an open line.
  if (opts.llm && upstreamMode() !== 'none') {
    try {
      const { res } = await usepodPost('/v1/chat/completions', {
          model: config.usepod.memoModel,
          max_tokens: 220,
          temperature: 0.2,
          messages: [
            { role: 'system', content: 'You are a credit analyst for Tokenline, which lends AI inference to Solana agents against their on-chain creator-fee revenue. Write a 3-sentence credit memo: the thesis, the key risk, and the decision. Plain text, no markdown, no dashes, no hype, cite the numbers given.' },
            { role: 'user', content: JSON.stringify({
              project: p.projectName, ticker: p.symbol, grade: s.grade, score: s.score,
              preApprovedLineUsd: s.lineUsd, monthlyCreatorRevenueUsd: s.monthlyCreatorUsd,
              factors: s.components.map((c) => ({ factor: c.label, points: `${c.points}/${c.max}`, detail: c.detail })),
            }) },
          ],
      });
      if (res.ok) {
        const j = await res.json();
        const t = j.choices?.[0]?.message?.content?.trim();
        if (t && t.length >= 80) { text = t.replace(/\s*[\u2013\u2014]\s*/g, ', '); source = 'usepod'; }
      }
    } catch { /* keep rules-based memo */ }
  }
  const v = { text, at: Date.now(), source };
  await store.setKv(key, v);
  return v;
}
