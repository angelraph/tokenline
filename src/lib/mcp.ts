import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { position, scoreForMint } from './account';
import { board } from './board';
import { config } from './config';
import { hashKey } from './keys';
import { solUsd } from './prices';
import { proxy } from './proxy';
import { store } from './store';
import { verdict } from './verdict';
import { movers } from './watch';

const text = (v: unknown) => ({ content: [{ type: 'text' as const, text: typeof v === 'string' ? v : JSON.stringify(v, null, 2) }] });
const fail = (msg: string) => ({ ...text(msg), isError: true });

/**
 * Tokenline's MCP tools, served over HTTP at /mcp. Public tools need no key;
 * credit tools read the agent's Tokenline key from the Authorization header.
 */
export function buildMcpServer(apiKey: string | null) {
  const server = new McpServer({ name: 'tokenline', version: '0.2.0' });

  const agentOrError = async () => {
    if (!apiKey) return { error: 'This tool needs your Tokenline key in the Authorization header (Bearer tl_...). Open a line at ' + config.baseUrl + '/apply' };
    const agent = await store.getAgentByKeyHash(hashKey(apiKey));
    return agent ? { agent } : { error: 'Unknown Tokenline key' };
  };

  server.registerTool('tl_check_credit', {
    title: 'Check Tokenline credit',
    description: 'Your credit line: limit, available, outstanding, prepaid, grade, collateral and where to repay.',
    inputSchema: {},
  }, async () => {
    const r = await agentOrError();
    if ('error' in r) return fail(r.error!);
    const p = await position(r.agent);
    return text({
      agent: r.agent.name, status: p.status, availableUsd: p.availableUsd, limitUsd: p.limitUsd,
      outstandingUsd: p.outstandingUsd, prepaidUsd: p.prepaidUsd, grade: p.score?.grade ?? null, score: p.score?.score ?? null,
      collateral: p.collateral, repayTo: config.poolWallet, collateralTo: config.escrowWallet,
    });
  });

  server.registerTool('tl_think', {
    title: 'Run an LLM call on credit',
    description: 'Send a prompt to a UsePod model. The cost is drawn from your Tokenline line and repaid later from your fees.',
    inputSchema: {
      prompt: z.string().describe('The user message'),
      system: z.string().optional().describe('Optional system prompt'),
      model: z.string().default('deepseek-v4-1-flash').describe('A model in the UsePod catalog'),
      max_tokens: z.number().int().min(1).max(8192).default(1024),
    },
  }, async ({ prompt, system, model, max_tokens }) => {
    if (!apiKey) return fail('This tool needs your Tokenline key in the Authorization header (Bearer tl_...).');
    const messages = [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content: prompt }];
    const res = await proxy(new Request(`${config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, max_tokens }),
    }), 'openai');
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return fail(body.error?.message ?? `HTTP ${res.status}`);
    const tx = res.headers.get('x-tokenline-payment-tx');
    return text(`${body.choices?.[0]?.message?.content ?? ''}\n\n[tokenline: charged $${res.headers.get('x-tokenline-charged-usd')}, available $${res.headers.get('x-tokenline-available-usd')}${tx ? `, UsePod paid on-chain: https://solscan.io/tx/${tx}` : ''}]`);
  });

  server.registerTool('tl_repay_quote', {
    title: 'Quote a repayment',
    description: 'Exact amount owed in USD and SOL, plus a Solana Pay link. Pay from your registered agent wallet.',
    inputSchema: {},
  }, async () => {
    const r = await agentOrError();
    if ('error' in r) return fail(r.error!);
    const [p, sol] = await Promise.all([position(r.agent), solUsd()]);
    if (!p.outstandingUsd) return text({ owedUsd: 0, message: 'Nothing outstanding.' });
    const owedSol = sol ? Math.ceil((p.outstandingUsd / sol) * 1e6) / 1e6 : null;
    return text({
      owedUsd: p.outstandingUsd, owedSol, payTo: config.poolWallet,
      solanaPay: owedSol ? `solana:${config.poolWallet}?amount=${owedSol}&label=Tokenline&message=${encodeURIComponent('Repay Tokenline line')}` : null,
      note: 'Send from your registered agent wallet; it is credited automatically.',
    });
  });

  server.registerTool('tl_score', {
    title: 'Credit report for a Clawrena agent',
    description: 'Score, grade, pre-approved line and a counterparty verdict for any tokenized Clawrena entry.',
    inputSchema: { mint: z.string().describe('Token mint address') },
  }, async ({ mint }) => {
    const r = await scoreForMint(mint);
    if (!r) return fail('That mint is not a tokenized Clawrena entry.');
    return text({
      project: r.project.projectName, symbol: r.project.symbol, grade: r.score.grade, score: r.score.score,
      ...verdict(r.score), preApprovedLineUsd: r.score.lineUsd, monthlyCreatorRevenueUsd: r.score.monthlyCreatorUsd,
      stale: r.score.stale, factors: r.score.components, report: `${config.baseUrl}/agent/${mint}`,
    });
  });

  server.registerTool('tl_board', {
    title: 'Top of the Credit Board',
    description: 'The highest rated Clawrena agents right now.',
    inputSchema: { limit: z.number().int().min(1).max(50).default(10) },
  }, async ({ limit }) => {
    const { rows } = await board();
    return text(rows.slice(0, limit).map((r) => ({ rank: r.rank, project: r.project, symbol: r.symbol, grade: r.grade, score: r.score, lineUsd: r.lineUsd, mint: r.mint })));
  });

  server.registerTool('tl_watch', {
    title: 'Credit Watch',
    description: 'Rating actions across all Clawrena agents: upgrades, downgrades, newly approved and pulled lines.',
    inputSchema: { hours: z.number().int().min(1).max(168).default(24) },
  }, async ({ hours }) => {
    const { rows } = await board();
    const { moves } = await movers(rows, hours);
    if (!moves.length) return text(`No rating actions in the last ${hours}h.`);
    return text(moves.slice(0, 20).map((m) => ({ project: m.project, symbol: m.symbol, action: m.kind, score: `${m.from} -> ${m.to}`, grade: m.gradeTo, mint: m.mint })));
  });

  return server;
}
