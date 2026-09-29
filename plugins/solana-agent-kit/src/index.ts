import { Transaction } from '@solana/web3.js';
import type { Action, Plugin, SolanaAgentKit } from 'solana-agent-kit';
import { z } from 'zod';

/**
 * Tokenline plugin for Solana Agent Kit v2.
 * Credit scores for every Clawrena agent and pay-later AI compute on UsePod.
 *
 *   const agent = new SolanaAgentKit(wallet, rpcUrl, {}).use(createTokenlinePlugin({ apiKey: 'tl_...' }));
 */
export type TokenlineOptions = { apiKey?: string; baseUrl?: string };

type Json = Record<string, any>;

function client(opts: TokenlineOptions) {
  const base = (opts.baseUrl ?? 'https://tokenline.vercel.app').replace(/\/$/, '');
  const call = async (path: string, init: RequestInit = {}, auth = false): Promise<Json> => {
    const headers: Record<string, string> = { 'content-type': 'application/json', ...(init.headers as Record<string, string>) };
    if (auth) {
      if (!opts.apiKey) throw new Error(`A Tokenline key is required. Open a line at ${base}/apply`);
      headers.authorization = `Bearer ${opts.apiKey}`;
    }
    const res = await fetch(`${base}${path}`, { ...init, headers });
    const body = (await res.json().catch(() => ({}))) as Json;
    if (!res.ok) throw new Error(body.error?.message ?? body.error ?? body.message ?? `Tokenline HTTP ${res.status}`);
    return body;
  };

  /** Ask a Tokenline Blink endpoint for an unsigned transaction, sign it with the agent wallet and send it. */
  const signAndSend = async (agent: SolanaAgentKit, path: string) => {
    const res = await fetch(`${base}${path}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ account: agent.wallet.publicKey.toBase58() }),
    });
    const body = (await res.json().catch(() => ({}))) as Json;
    if (!res.ok || !body.transaction) throw new Error(body.message ?? `Tokenline HTTP ${res.status}`);
    const tx = Transaction.from(Buffer.from(body.transaction, 'base64'));
    const signed = await agent.wallet.signTransaction(tx);
    const signature = await agent.connection.sendRawTransaction(signed.serialize());
    await agent.connection.confirmTransaction(signature, 'confirmed');
    return { signature, message: body.message as string, explorer: `https://solscan.io/tx/${signature}` };
  };

  return {
    base,
    score: (mint: string) => call(`/api/score/${mint}`),
    board: async (limit = 10) => ((await call('/api/board')).rows as Json[]).slice(0, limit)
      .map((r) => ({ rank: r.rank, project: r.project, symbol: r.symbol, grade: r.grade, score: r.score, lineUsd: r.lineUsd, mint: r.mint })),
    watch: (hours = 24) => call(`/api/watch?hours=${hours}`),
    credit: () => call('/api/me', {}, true),
    think: (prompt: string, model = 'deepseek-v4-1-flash', maxTokens = 600) =>
      call('/v1/chat/completions', { method: 'POST', body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }) }, true),
    repay: (agent: SolanaAgentKit, amountSol: number) => signAndSend(agent, `/api/actions/repay?amount=${amountSol}`),
    lockAnsem: (agent: SolanaAgentKit, amount: number) => signAndSend(agent, `/api/actions/collateral?amount=${amount}`),
  };
}

export function createTokenlinePlugin(opts: TokenlineOptions = {}): Plugin {
  const tl = client(opts);
  const ok = (data: Json) => ({ status: 'success', ...data });
  const err = (e: unknown) => ({ status: 'error', message: (e as Error).message });

  const actions: Action[] = [
    {
      name: 'TOKENLINE_SCORE',
      similes: ['credit score of agent', 'vet counterparty', 'is this agent trustworthy', 'tokenline grade', 'rate this token'],
      description: 'Get the Tokenline credit report for a tokenized Clawrena agent: grade (AAA to C), score (0 to 1000), counterparty verdict and memo. Use before paying, trading with or partnering with another agent.',
      examples: [[{ input: { mint: '7TKRV4SneC6xLRaAt21a6d1kheAzXHGKP9WDzri9aD2e' }, output: { status: 'success', grade: 'AAA', score: 910 }, explanation: 'Look up an agent by its token mint' }]],
      schema: z.object({ mint: z.string().min(32).describe('Token mint address') }),
      handler: async (_agent, input) => {
        try {
          const r = await tl.score(input.mint);
          return ok({ project: r.project?.projectName, symbol: r.project?.symbol, grade: r.grade, score: r.score, stale: r.stale, lineUsd: r.lineUsd, memo: r.memo?.text, report: `${tl.base}/agent/${input.mint}` });
        } catch (e) { return err(e); }
      },
    },
    {
      name: 'TOKENLINE_BOARD',
      similes: ['top rated agents', 'tokenline leaderboard', 'best agents on solana', 'credit board'],
      description: 'List the highest rated Clawrena agents on the Tokenline Credit Board.',
      examples: [[{ input: { limit: 3 }, output: { status: 'success', agents: [] }, explanation: 'Top 3 agents' }]],
      schema: z.object({ limit: z.number().int().min(1).max(50).default(10) }),
      handler: async (_agent, input) => { try { return ok({ agents: await tl.board(input.limit) }); } catch (e) { return err(e); } },
    },
    {
      name: 'TOKENLINE_WATCH',
      similes: ['rating changes', 'credit watch', 'upgrades and downgrades', 'which agents went quiet'],
      description: 'Rating actions across Clawrena agents: upgrades, downgrades, newly approved and pulled lines.',
      examples: [[{ input: { hours: 24 }, output: { status: 'success', moves: [] }, explanation: 'Last day of rating actions' }]],
      schema: z.object({ hours: z.number().int().min(1).max(168).default(24) }),
      handler: async (_agent, input) => { try { const w = await tl.watch(input.hours); return ok({ since: w.since, moves: w.moves }); } catch (e) { return err(e); } },
    },
    {
      name: 'TOKENLINE_CHECK_CREDIT',
      similes: ['my credit line', 'how much compute credit do I have', 'tokenline balance'],
      description: "This agent's Tokenline credit line: limit, available, outstanding, prepaid and status. Needs a Tokenline key.",
      examples: [[{ input: {}, output: { status: 'success', availableUsd: 0.88 }, explanation: 'Check the line' }]],
      schema: z.object({}),
      handler: async () => {
        try { const m = await tl.credit(); const p = m.position; return ok({ status_: p.status, availableUsd: p.availableUsd, limitUsd: p.limitUsd, outstandingUsd: p.outstandingUsd, prepaidUsd: p.prepaidUsd, repayTo: m.repay?.to }); }
        catch (e) { return err(e); }
      },
    },
    {
      name: 'TOKENLINE_THINK',
      similes: ['think on credit', 'use tokenline compute', 'borrow compute'],
      description: 'Run an LLM call on UsePod paid from the Tokenline credit line, repaid later from creator fees. Needs a Tokenline key.',
      examples: [[{ input: { prompt: 'Summarize SOL news' }, output: { status: 'success', answer: '...' }, explanation: 'One call on credit' }]],
      schema: z.object({ prompt: z.string().min(1), model: z.string().optional(), maxTokens: z.number().int().min(1).max(8192).optional() }),
      handler: async (_agent, input) => {
        try { const r = await tl.think(input.prompt, input.model, input.maxTokens); return ok({ answer: r.choices?.[0]?.message?.content ?? '', model: r.model }); }
        catch (e) { return err(e); }
      },
    },
    {
      name: 'TOKENLINE_REPAY',
      similes: ['repay tokenline', 'pay back compute credit', 'settle my line'],
      description: 'Repay the Tokenline line in SOL from this agent wallet. The wallet must be the one registered with Tokenline.',
      examples: [[{ input: { amountSol: 0.001 }, output: { status: 'success', signature: '...' }, explanation: 'Repay 0.001 SOL' }]],
      schema: z.object({ amountSol: z.number().min(0.001).max(10) }),
      handler: async (agent, input) => { try { return ok(await tl.repay(agent, input.amountSol)); } catch (e) { return err(e); } },
    },
    {
      name: 'TOKENLINE_LOCK_ANSEM',
      similes: ['lock ansem', 'add collateral', 'raise my credit line'],
      description: 'Lock $ANSEM from this agent wallet as Tokenline collateral to raise the credit line (counts at 50% of value).',
      examples: [[{ input: { amount: 5 }, output: { status: 'success', signature: '...' }, explanation: 'Lock 5 ANSEM' }]],
      schema: z.object({ amount: z.number().min(1) }),
      handler: async (agent, input) => { try { return ok(await tl.lockAnsem(agent, input.amount)); } catch (e) { return err(e); } },
    },
  ];

  return {
    name: 'tokenline',
    methods: {
      tokenlineScore: (mint: string) => tl.score(mint),
      tokenlineBoard: (limit?: number) => tl.board(limit),
      tokenlineWatch: (hours?: number) => tl.watch(hours),
      tokenlineCredit: () => tl.credit(),
      tokenlineThink: (prompt: string, model?: string, maxTokens?: number) => tl.think(prompt, model, maxTokens),
      tokenlineRepay: (agent: SolanaAgentKit, amountSol: number) => tl.repay(agent, amountSol),
      tokenlineLockAnsem: (agent: SolanaAgentKit, amount: number) => tl.lockAnsem(agent, amount),
    },
    actions,
    initialize: () => undefined,
  };
}

export default createTokenlinePlugin;
