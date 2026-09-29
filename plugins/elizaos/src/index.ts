import type { Action, ActionResult, HandlerCallback, IAgentRuntime, Memory, Plugin } from '@elizaos/core';

/**
 * Tokenline plugin for ElizaOS.
 * Credit scores for every Clawrena agent from on-chain creator fees, plus the agent's own compute credit line.
 * Settings: TOKENLINE_KEY (optional, for the credit line), TOKENLINE_URL (optional).
 */

type Json = Record<string, any>;
const MINT_RE = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/;

const baseOf = (runtime: IAgentRuntime) => String(runtime.getSetting('TOKENLINE_URL') || 'https://tokenline.vercel.app').replace(/\/$/, '');

async function call(runtime: IAgentRuntime, path: string, auth = false): Promise<Json> {
  const headers: Record<string, string> = {};
  if (auth) {
    const key = runtime.getSetting('TOKENLINE_KEY');
    if (!key) throw new Error(`Set TOKENLINE_KEY to use your credit line. Open one at ${baseOf(runtime)}/apply`);
    headers.authorization = `Bearer ${key}`;
  }
  const res = await fetch(`${baseOf(runtime)}${path}`, { headers });
  const body = (await res.json().catch(() => ({}))) as Json;
  if (!res.ok) throw new Error(body.error?.message ?? body.error ?? `Tokenline HTTP ${res.status}`);
  return body;
}

async function reply(callback: HandlerCallback | undefined, text: string, data: Json, action: string): Promise<ActionResult> {
  await callback?.({ text, actions: [action] });
  return { success: true, text, data };
}

async function failed(callback: HandlerCallback | undefined, e: unknown, action: string): Promise<ActionResult> {
  const text = `Tokenline lookup failed: ${(e as Error).message}`;
  await callback?.({ text, actions: [action] });
  return { success: false, text, error: e as Error };
}

const scoreAction: Action = {
  name: 'TOKENLINE_SCORE',
  similes: ['CREDIT_SCORE', 'VET_AGENT', 'CHECK_AGENT_GRADE', 'RATE_TOKEN'],
  description: 'Get the Tokenline credit report (grade AAA to C, score 0 to 1000, verdict) for a tokenized Clawrena agent by its token mint. Use before trading with, paying or partnering with another agent.',
  validate: async (_runtime: IAgentRuntime, message: Memory) => MINT_RE.test(message.content?.text ?? ''),
  handler: async (runtime, message, _state, _options, callback) => {
    const mint = (message.content?.text ?? '').match(MINT_RE)?.[0];
    if (!mint) return failed(callback, new Error('no token mint found in the message'), 'TOKENLINE_SCORE');
    try {
      const r = await call(runtime, `/api/score/${mint}`);
      const text = `${r.project?.projectName} ($${r.project?.symbol}) is rated ${r.grade} (${r.score}/1000) on Tokenline${r.stale ? ', but its fees have gone quiet' : ''}. ${r.memo?.text ?? ''} Report: ${baseOf(runtime)}/agent/${mint}`;
      return reply(callback, text, r, 'TOKENLINE_SCORE');
    } catch (e) { return failed(callback, e, 'TOKENLINE_SCORE'); }
  },
  examples: [[
    { name: '{{user}}', content: { text: 'Is 7TKRV4SneC6xLRaAt21a6d1kheAzXHGKP9WDzri9aD2e safe to deal with?' } },
    { name: '{{agent}}', content: { text: 'Shinjuku StAItion ($SHINJUKU) is rated AAA (910/1000) on Tokenline.', actions: ['TOKENLINE_SCORE'] } },
  ]],
};

const boardAction: Action = {
  name: 'TOKENLINE_BOARD',
  similes: ['TOP_AGENTS', 'CREDIT_BOARD', 'LEADERBOARD'],
  description: 'List the highest rated agents on the Tokenline Credit Board.',
  validate: async () => true,
  handler: async (runtime, _message, _state, _options, callback) => {
    try {
      const rows = ((await call(runtime, '/api/board')).rows as Json[]).slice(0, 5);
      const text = 'Top rated on Tokenline right now:\n' + rows.map((r) => `${r.rank}. ${r.project} ($${r.symbol}) ${r.grade} ${r.score}`).join('\n');
      return reply(callback, text, { rows }, 'TOKENLINE_BOARD');
    } catch (e) { return failed(callback, e, 'TOKENLINE_BOARD'); }
  },
  examples: [[
    { name: '{{user}}', content: { text: 'Who are the best rated agents on Tokenline?' } },
    { name: '{{agent}}', content: { text: 'Top rated on Tokenline right now: 1. SelfMade by SP3ND AAA 950', actions: ['TOKENLINE_BOARD'] } },
  ]],
};

const watchAction: Action = {
  name: 'TOKENLINE_WATCH',
  similes: ['RATING_CHANGES', 'CREDIT_WATCH', 'UPGRADES_DOWNGRADES'],
  description: 'Tokenline rating actions over the last 24 hours: upgrades, downgrades, newly approved and pulled lines.',
  validate: async () => true,
  handler: async (runtime, _message, _state, _options, callback) => {
    try {
      const w = await call(runtime, '/api/watch?hours=24');
      const moves = (w.moves as Json[]).slice(0, 8);
      const text = moves.length
        ? 'Tokenline rating actions, last 24h:\n' + moves.map((m) => `${m.project}: ${m.from} -> ${m.to} (${m.kind})`).join('\n')
        : 'No Tokenline rating actions in the last 24 hours.';
      return reply(callback, text, { moves }, 'TOKENLINE_WATCH');
    } catch (e) { return failed(callback, e, 'TOKENLINE_WATCH'); }
  },
  examples: [[
    { name: '{{user}}', content: { text: 'Any Tokenline upgrades or downgrades today?' } },
    { name: '{{agent}}', content: { text: 'Tokenline rating actions, last 24h: ...', actions: ['TOKENLINE_WATCH'] } },
  ]],
};

const creditAction: Action = {
  name: 'TOKENLINE_CHECK_CREDIT',
  similes: ['MY_CREDIT_LINE', 'COMPUTE_CREDIT', 'TOKENLINE_BALANCE'],
  description: "This agent's Tokenline credit line: available, limit, outstanding and status. Needs TOKENLINE_KEY.",
  validate: async (runtime: IAgentRuntime) => !!runtime.getSetting('TOKENLINE_KEY'),
  handler: async (runtime, _message, _state, _options, callback) => {
    try {
      const m = await call(runtime, '/api/me', true);
      const p = m.position;
      const text = `Tokenline line: $${p.availableUsd} available of a $${p.limitUsd} limit, $${p.outstandingUsd} outstanding (status: ${p.status}). Repay in SOL or USDC to ${m.repay?.to}.`;
      return reply(callback, text, p, 'TOKENLINE_CHECK_CREDIT');
    } catch (e) { return failed(callback, e, 'TOKENLINE_CHECK_CREDIT'); }
  },
  examples: [[
    { name: '{{user}}', content: { text: 'How much compute credit do we have left?' } },
    { name: '{{agent}}', content: { text: 'Tokenline line: $0.88 available of a $0.50 limit.', actions: ['TOKENLINE_CHECK_CREDIT'] } },
  ]],
};

export const tokenlinePlugin: Plugin = {
  name: 'tokenline',
  description: 'Credit scores for Solana agents from on-chain creator fees, and pay-later AI compute on UsePod.',
  actions: [scoreAction, boardAction, watchAction, creditAction],
};

export default tokenlinePlugin;
