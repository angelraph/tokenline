#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE = (process.env.TOKENLINE_URL || 'https://tokenline.vercel.app').replace(/\/$/, '');
const KEY = process.env.TOKENLINE_KEY ?? '';

type Json = Record<string, any>;

async function call(path: string, init: RequestInit = {}, auth = true): Promise<{ status: number; body: Json }> {
  const headers: Record<string, string> = { 'content-type': 'application/json', ...(init.headers as Record<string, string>) };
  if (auth) {
    if (!KEY) throw new Error('TOKENLINE_KEY is required for this tool. Open a line at ' + BASE + '/apply');
    headers.authorization = `Bearer ${KEY}`;
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const body = (await res.json().catch(() => ({}))) as Json;
  return { status: res.status, body };
}

const text = (v: unknown) => ({ content: [{ type: 'text' as const, text: typeof v === 'string' ? v : JSON.stringify(v, null, 2) }] });
const fail = (msg: string) => ({ ...text(msg), isError: true });

const server = new McpServer({ name: 'tokenline', version: '0.1.0' });

server.registerTool('tl_check_credit', {
  title: 'Check Tokenline credit',
  description: 'Your credit line: limit, available, outstanding, prepaid, grade, collateral and where to repay.',
  inputSchema: {},
}, async () => {
  const { status, body } = await call('/api/me');
  if (status !== 200) return fail(body.error ?? `HTTP ${status}`);
  const p = body.position;
  return text({
    agent: body.agent.name, status: p.status, availableUsd: p.availableUsd, limitUsd: p.limitUsd,
    outstandingUsd: p.outstandingUsd, prepaidUsd: p.prepaidUsd, grade: p.score?.grade ?? null, score: p.score?.score ?? null,
    unsecuredLineUsd: p.unsecuredLineUsd, securedLineUsd: p.securedLineUsd, collateral: p.collateral,
    repayTo: body.repay.to, collateralTo: body.collateral.to,
  });
});

server.registerTool('tl_think', {
  title: 'Run an LLM call on credit',
  description: 'Send a prompt to any UsePod model. The cost is drawn from your Tokenline line and repaid later from your fees.',
  inputSchema: {
    prompt: z.string().describe('The user message'),
    system: z.string().optional().describe('Optional system prompt'),
    model: z.string().default('deepseek-v4-1-flash').describe('Any model in the UsePod catalog'),
    max_tokens: z.number().int().min(1).max(8192).default(1024),
  },
}, async ({ prompt, system, model, max_tokens }) => {
  const messages = [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content: prompt }];
  const res = await fetch(`${BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model, messages, max_tokens }),
  });
  const body = (await res.json().catch(() => ({}))) as Json;
  if (!res.ok) return fail(body.error?.message ?? `HTTP ${res.status}`);
  const charged = res.headers.get('x-tokenline-charged-usd');
  const left = res.headers.get('x-tokenline-available-usd');
  return text(`${body.choices?.[0]?.message?.content ?? ''}\n\n[tokenline: charged $${charged}, available $${left}]`);
});

server.registerTool('tl_repay_quote', {
  title: 'Quote a repayment',
  description: 'Exact amount owed in USD and SOL, plus a Solana Pay link. Pay from your registered agent wallet.',
  inputSchema: {},
}, async () => {
  const { status, body } = await call('/api/me');
  if (status !== 200) return fail(body.error ?? `HTTP ${status}`);
  const owed = body.position.outstandingUsd;
  if (!owed) return text({ owedUsd: 0, message: 'Nothing outstanding.' });
  const sol = body.repay.amountSol;
  const link = body.repay.to && sol
    ? `solana:${body.repay.to}?amount=${sol}&label=Tokenline&message=${encodeURIComponent('Repay Tokenline line')}`
    : null;
  return text({ owedUsd: owed, owedSol: sol, payTo: body.repay.to, solanaPay: link, note: body.repay.note });
});

server.registerTool('tl_score', {
  title: 'Credit report for a Clawrena agent',
  description: 'Score, grade, pre-approved line and memo for any tokenized Clawrena entry. Use it to vet a counterparty before trading or paying it.',
  inputSchema: { mint: z.string().describe('Token mint address') },
}, async ({ mint }) => {
  const { status, body } = await call(`/api/score/${mint}`, {}, false);
  if (status !== 200) return fail(body.error ?? `HTTP ${status}`);
  return text({
    project: body.project.projectName, symbol: body.project.symbol, grade: body.grade, score: body.score,
    preApprovedLineUsd: body.lineUsd, monthlyCreatorRevenueUsd: body.monthlyCreatorUsd, stale: body.stale,
    factors: body.components, memo: body.memo.text,
  });
});

server.registerTool('tl_board', {
  title: 'Top of the Credit Board',
  description: 'The highest-rated Clawrena agents right now.',
  inputSchema: { limit: z.number().int().min(1).max(50).default(10) },
}, async ({ limit }) => {
  const { status, body } = await call('/api/board', {}, false);
  if (status !== 200) return fail(body.error ?? `HTTP ${status}`);
  return text(body.rows.slice(0, limit).map((r: Json) => ({
    rank: r.rank, project: r.project, symbol: r.symbol, grade: r.grade, score: r.score, lineUsd: r.lineUsd, mint: r.mint,
  })));
});

server.registerTool('tl_watch', {
  title: 'Credit Watch',
  description: 'Rating actions across all Clawrena agents: upgrades, downgrades, newly approved and pulled lines.',
  inputSchema: { hours: z.number().int().min(1).max(168).default(24) },
}, async ({ hours }) => {
  const { status, body } = await call(`/api/watch?hours=${hours}`, {}, false);
  if (status !== 200) return fail(body.error ?? `HTTP ${status}`);
  if (!body.moves.length) return text(`No rating actions in the last ${hours}h.`);
  return text(body.moves.slice(0, 20).map((m: Json) => ({
    project: m.project, symbol: m.symbol, action: m.kind, score: `${m.from} -> ${m.to}`, grade: m.gradeTo, mint: m.mint,
  })));
});

await server.connect(new StdioServerTransport());
