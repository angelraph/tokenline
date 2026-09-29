# Tokenline ($TOKENL)

**Pay-later compute for AI agents.** Tokenline fronts UsePod inference to Solana agents today and gets repaid from their on-chain creator fees tomorrow.

**Live:** https://tokenline.vercel.app · **X:** [@tokenlinehq](https://x.com/tokenlinehq) · **Token:** [$TOKENL](https://clawpump.tech/tokens/4sfvc4dHviSKG33KnT6ZvecXtUpvqtE4Nb4Stkj2S9Ya) `4sfvc4dHviSKG33KnT6ZvecXtUpvqtE4Nb4Stkj2S9Ya`

Built for the AnsemHack Clawrena. Tracks: ClawPump x pump.fun (builder), Inference Markets (UsePod), Overall.


## The problem

A newly launched agent needs compute to do the work that earns its fees. Until those fees arrive, it cannot pay for compute. Every agent hits this cold start, and there is no credit market for it.

What makes credit possible now: an agent's revenue is public. Every ClawPump token's creator fees are on-chain. Tokenline underwrites that cash flow and pays out the loan as inference.

## What it does

| Module | What it does |
|---|---|
| **Credit Board** | Scores every tokenized Clawrena entry (188 at launch) from ClawPump's public fee feed. It shows a 0 to 1000 score, a grade from AAA to C, and a pre-approved line. |
| **Underwriter** | A deterministic model anyone can recompute. Inputs: creator-fee run-rate, fee recency, collection consistency, 24h volume and top-10 holder concentration (Helius). Repayment history adjusts the score. |
| **Compute Line** | An OpenAI-compatible `/v1/chat/completions` and Anthropic-compatible `/v1/messages` endpoint. Each call is routed to the best-priced UsePod provider, metered per token and booked to the agent's line at cost plus 15%. Calls stop hard at the limit. Streaming is supported. |
| **On-chain repayment** | Agents send SOL or USDC from their registered wallet to the pool. A Helius webhook credits the payment in seconds, and every entry links to its transaction. Overpayments become prepaid compute. |
| **$ANSEM collateral** | $ANSEM sent to escrow counts at 50% LTV. Any agent, with or without a Clawrena token, can open a secured line. |
| **$TOKENL utility** | Holders of 100k+ $TOKENL get 25% more unsecured line. $TOKENL is also accepted as collateral. |
| **Credit Watch** | Re-rates all Clawrena agents every hour. Flags upgrades, downgrades, newly approved lines and lines pulled because fees went quiet. |
| **Credit Reports over x402** | Any agent buys a machine-readable report with an `extend`, `caution` or `avoid` verdict for $0.02 in SOL, using the same x402 wire format as UsePod. Payment goes straight to the lending pool and is verified on-chain. |
| **Credit Badge** | An SVG of any agent's current grade, regenerated every few minutes, for READMEs, sites and banners. |
| **Spend analytics** | Each agent sees where its compute goes: calls, tokens and spend by model. |
| **Credit memos on UsePod** | Each credit report includes an analyst memo written by an LLM bought through UsePod. |
| **MCP server + skill** | `tl_check_credit`, `tl_think`, `tl_repay_quote`, `tl_score`, `tl_board` and `tl_watch` as MCP tools, plus a ClawPump skill file. Any Hermes or ClawPump agent can draw, repay and vet counterparties. |
| **Public ledger** | Every draw, repayment, collateral move and pool deposit, with pool revenue and default rate. |
| **Operator console** | Verifies X handles, freezes lines and triggers chain syncs. Every action is written to the ledger. |

## Credit policy

- **Unsecured line** = `min($25, 10% of monthly creator revenue) x score / 1000`. It unlocks once the project's X account posts its verification code.
- **Secured line** = 50% of collateral value.
- **Price** = UsePod cost + 15% spread. No interest while the agent is current.
- **Delinquency**: a balance with no repayment for 14 days freezes the line and costs 300 points on the public board. Tokens with no fees for 7 days lose the unsecured line.
- **Custody**: the escrow wallet is a published, operator-held address. Limits are deliberately small. A trustless on-chain program is on the roadmap.

## Integrations

| Where | How |
|---|---|
| **ClawPump agents** | Custom skill in `skill/tokenline/`, submitted to the ClawPump Community Skills registry |
| **Any MCP client** | Remote MCP server at `https://tokenline.vercel.app/mcp` (6 tools, nothing to install) |
| **Solana Agent Kit v2** | `plugins/solana-agent-kit`: 7 actions, including repay and lock $ANSEM signed by the agent wallet |
| **ElizaOS v1** | `plugins/elizaos`: score, board, watch and credit actions |
| **Solana Blinks** | `/actions.json` plus repay, lock $ANSEM and buy-report actions |

## Architecture

```
Agent SDK  -> /v1/* (Tokenline proxy: auth, limit check, metering)
           -> UsePod marketplace (best-priced provider, paid from the pool)

ClawPump fee feed        -> Underwriter -> Credit Board, reports, memos
Solana (Helius webhook)  -> Ledger: repay, collateral, deposit
```

- `src/lib/score.ts`: underwriting model (pure, unit tested)
- `src/lib/proxy.ts`: metered UsePod pass-through (JSON and SSE)
- `src/lib/sync.ts`: classifies on-chain transfers into ledger entries (idempotent)
- `src/lib/account.ts`: limits, availability, delinquency
- `src/lib/store.ts`: Postgres in production, JSON file for local development
- `src/lib/usepod.ts`: UsePod client, token or x402 pay-per-request
- `src/lib/x402-seller.ts`: signed quotes and on-chain settlement for report sales
- `src/lib/watch.ts`: hourly snapshots and rating actions
- `src/lib/mcp.ts` and `/mcp`: remote MCP server (Streamable HTTP)
- `mcp/`: the same tools as a local stdio MCP server
- `skill/tokenline/`: ClawPump / Hermes skill (SKILL.md + metadata.json, community registry format)

## Run it

```bash
npm install
cp .env.example .env.local   # fill in UsePod token, Helius key, pool wallet
npm run dev
```

Tests: `npm test`. Types and production build: `npm run build`.

### Paying UsePod: two modes

- **x402 pay-per-request (default for launch).** Leave `USEPOD_PROXY_TOKEN` empty and set `SPENDER_SECRET_KEY` to a small, separate hot wallet. Each call is paid on-chain in SOL at UsePod's quoted cap (about 1,100 lamports for a small call). Unused cap is credited back by UsePod. A few cents cover hundreds of calls, and each payment is linked in the ledger.
- **Prepaid token.** Set `USEPOD_PROXY_TOKEN` to use a funded UsePod balance instead.

The pool wallet is receive-only. Its private key is never needed by Tokenline.

### Deploy (Vercel + Neon)

1. Import the repo into Vercel and set the variables from `.env.example`, including `DATABASE_URL` for Postgres.
2. In Helius, create an **enhanced** webhook on `POOL_WALLET` and `ESCROW_WALLET`. Point it at `https://<host>/api/webhooks/helius` and set its auth header to `CRON_SECRET`.
3. Put a few cents of SOL in the spender wallet. Launch $TOKENL with its payout wallet set to `POOL_WALLET`, so the token's own creator fees refill the pool.

### Agent integration

```python
from openai import OpenAI
client = OpenAI(base_url="https://<host>/v1", api_key="tl_...")
client.chat.completions.create(model="deepseek-v4-1-flash", messages=[{"role": "user", "content": "gm"}])
```

MCP (remote, nothing to install):

```json
{ "mcpServers": { "tokenline": { "url": "https://tokenline.vercel.app/mcp",
  "headers": { "Authorization": "Bearer tl_..." } } } }
```

Or run it locally from `mcp/` (`npm install && npm run build`, then `node mcp/dist/index.js` with `TOKENLINE_URL` and `TOKENLINE_KEY`).

## Public API

| Method | Path | Auth | Returns |
|---|---|---|---|
| GET | `/api/board` | none | every Clawrena entry, scored |
| GET | `/api/score/:mint` | none | credit report and memo |
| GET | `/api/pool` | none | pool totals, spread revenue, default rate |
| GET | `/api/ledger` | none | public ledger |
| GET | `/api/watch?hours=24` | none | rating actions |
| GET | `/api/badge/:mint` | none | SVG credit badge (current grade) |
| GET | `/api/x402/report/:mint` | x402 (SOL) | paid credit report with verdict |
| GET | `/api/me` | `tl_` key | own position, spend by model, repay instructions |
| POST | `/v1/chat/completions` | `tl_` key | OpenAI-compatible, metered |
| POST | `/v1/messages` | `tl_` key | Anthropic-compatible, metered |

## Roadmap

1. Trustless escrow and lending program (Anchor), so collateral never sits with an operator.
2. Automatic creator-fee redirection: fees repay the line before they reach the agent.
3. Open lending pool: backers deposit USDC and earn the spread.
4. Agent-to-agent credit: agents with an A grade or better can extend lines to others, with Tokenline as clearing house.
5. Reselling idle agent GPU capacity into UsePod, with receivables netted against the line.

## Data sources

- ClawPump Clawrena fee feed: `https://clawpump.tech/api/ansemhack/fees`
- UsePod: `https://api.usepod.ai/proxy/<token>/v1`
- $ANSEM mint: `9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump`
- Prices: DexScreener. Chain data: Helius.
