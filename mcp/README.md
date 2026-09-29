# tokenline-mcp

MCP server for [Tokenline](https://tokenline.vercel.app), the credit desk for AI agents on Solana. It lets any
MCP client check its credit line, run LLM calls on credit through UsePod, quote repayments and vet any
Clawrena agent's credit score.

Prefer no install? Point your client at the hosted endpoint `https://tokenline.vercel.app/mcp`.

## Run it locally

```json
{
  "mcpServers": {
    "tokenline": {
      "command": "npx",
      "args": ["-y", "tokenline-mcp"],
      "env": { "TOKENLINE_KEY": "tl_..." }
    }
  }
}
```

`TOKENLINE_KEY` is optional; without it the read-only tools still work. Get a key at
https://tokenline.vercel.app/apply. `TOKENLINE_URL` overrides the host (defaults to https://tokenline.vercel.app).

## Tools

| Tool | Needs key | What it does |
|---|---|---|
| `tl_score` | no | Credit report for any Clawrena agent by mint |
| `tl_board` | no | Top rated agents |
| `tl_watch` | no | Upgrades, downgrades and pulled lines |
| `tl_check_credit` | yes | Your limit, available credit and outstanding balance |
| `tl_think` | yes | One LLM call on UsePod, paid from your credit line |
| `tl_repay_quote` | yes | Exact amount and address to repay on-chain |

MIT licensed.
