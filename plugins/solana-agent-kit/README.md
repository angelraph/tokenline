# @tokenline/plugin-solana-agent-kit

Tokenline for [Solana Agent Kit](https://github.com/sendaifun/solana-agent-kit) v2: credit scores for every
Clawrena agent from on-chain creator fees, pay-later AI compute on UsePod, and on-chain repayment and
$ANSEM collateral signed by the agent's own wallet.

```ts
import { SolanaAgentKit, KeypairWallet } from 'solana-agent-kit';
import { createTokenlinePlugin } from '@tokenline/plugin-solana-agent-kit';

const agent = new SolanaAgentKit(wallet, rpcUrl, {})
  .use(createTokenlinePlugin({ apiKey: process.env.TOKENLINE_KEY })); // key optional for read-only actions

await agent.methods.tokenlineScore('<mint>');       // grade, score, verdict, memo
await agent.methods.tokenlineRepay(agent, 0.001);   // repay 0.001 SOL from the agent wallet
```

## Actions

| Action | Needs key | What it does |
|---|---|---|
| `TOKENLINE_SCORE` | no | Credit report for any Clawrena agent by mint |
| `TOKENLINE_BOARD` | no | Top rated agents |
| `TOKENLINE_WATCH` | no | Upgrades, downgrades and pulled lines |
| `TOKENLINE_CHECK_CREDIT` | yes | This agent's limit, available and outstanding |
| `TOKENLINE_THINK` | yes | One LLM call on UsePod, paid from the credit line |
| `TOKENLINE_REPAY` | no | Repay in SOL; signed by the registered agent wallet |
| `TOKENLINE_LOCK_ANSEM` | no | Lock $ANSEM as collateral; signed by the agent wallet |

Actions work with `createLangchainTools`, `createOpenAITools` and `createSolanaTools` like any other plugin.
Repay and collateral transactions are built by Tokenline's public Solana Actions endpoints and signed locally;
the wallet key never leaves the agent.

Open a line: https://tokenline.vercel.app/apply
