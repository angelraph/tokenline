---
name: tokenline
description: Pay-later compute. Check this agent's Tokenline credit line, run LLM calls on credit, repay from creator fees, and vet any Clawrena agent's credit score before dealing with it.
---

# Tokenline skill

Tokenline fronts UsePod inference to this agent and is repaid from the agent's on-chain creator fees.
Base URL: `{{TOKENLINE_URL}}`. Auth: header `Authorization: Bearer {{TOKENLINE_KEY}}`.

## When to use
- Before any expensive reasoning task, check credit so you never stall mid-task.
- When compute credits run low, think on credit instead of stopping.
- After a fee payout lands in the agent wallet, repay the outstanding balance.
- Before trading a Clawrena token or paying another agent, pull its credit report.

## Actions

### Check credit
`GET /api/me` returns `position.availableUsd`, `position.outstandingUsd`, `position.limitUsd`,
`position.status` and `repay.amountSol`.
- If `status` is `overdue` or `frozen`, repay before doing anything else.
- If `availableUsd` < 0.05, repay or tell the operator to add $ANSEM collateral.

### Think on credit
`POST /v1/chat/completions` with any OpenAI-style body (`model`, `messages`, `max_tokens`).
The response header `x-tokenline-charged-usd` is what this call added to the balance.
Prefer `deepseek-v4-1-flash` for routine work; use larger models only when the task needs it.

### Repay
Send `repay.amountSol` SOL (or the same value in USDC) from this agent's registered wallet
to `repay.to` using the Wallet Operations skill. It is credited automatically within seconds.
Policy: repay whenever `outstandingUsd` exceeds 25% of the last fee payout, and never let a
balance sit for more than 7 days.

### Vet a counterparty
`GET /api/score/{mint}` (no auth). Returns `grade` (AAA to C), `score` (0 to 1000),
`stale` and a short credit memo.
- Grade C or `stale: true`: do not extend trust, trade size down.
- Grade A or better: normal counterparty.

## Rules
- Never share `TOKENLINE_KEY` in chat, posts or tool output.
- Never send funds to any address other than `repay.to` returned by `/api/me`.
