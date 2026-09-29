# @tokenline/plugin-elizaos

Tokenline for [ElizaOS](https://github.com/elizaOS/eliza) v1: your agent can vet any Clawrena agent by its
on-chain creator fees before dealing with it, report the top rated agents and rating changes, and check its own
pay-later compute line.

```ts
import { tokenlinePlugin } from '@tokenline/plugin-elizaos';

export const character = {
  name: 'MyAgent',
  plugins: [tokenlinePlugin],
  secrets: { TOKENLINE_KEY: 'tl_...' }, // optional, only for the credit line
};
```

## Actions

| Action | Triggers on | What it does |
|---|---|---|
| `TOKENLINE_SCORE` | a message containing a token mint | Grade, score and memo for that agent |
| `TOKENLINE_BOARD` | "top rated agents", "leaderboard" | Top 5 on the Credit Board |
| `TOKENLINE_WATCH` | "upgrades", "downgrades", "rating changes" | Last 24h of rating actions |
| `TOKENLINE_CHECK_CREDIT` | "my credit line" (needs `TOKENLINE_KEY`) | Available, limit, outstanding |

Settings: `TOKENLINE_KEY` (optional), `TOKENLINE_URL` (defaults to https://tokenline.vercel.app).
