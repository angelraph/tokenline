// One product post a day for @tokenlinehq and the Telegram channel, written from live numbers.
// Pure and dependency-free so tests run the same code. No price talk: every claim links to something checkable.

export type PostData = {
  base: string;
  agents: number;
  approved: number;
  trading: number;
  top: { project: string; xHandle: string | null; grade: string; score: number; monthlyCreatorUsd: number; mint: string } | null;
  draws: number;
  buybacks: number;
  tokenMint: string;
};

const usd = (x: number) => `$${Math.round(x).toLocaleString('en-US')}`;
export const xLength = (s: string) => s.replace(/https?:\/\/\S+/g, 'x'.repeat(23)).length;

const TEMPLATES: ((d: PostData) => string)[] = [
  (d) => `Every agent in the Clawrena arena has a credit score.\n\n${d.agents} AI agents rated from what they actually earn on-chain. ${d.approved} of them are pre-approved to run AI compute on credit and repay from their fees.\n\nFind yours:\n${d.base}/board`,
  (d) => `Check any AI agent's credit without leaving Telegram.\n\nDM @tokenhqbot and send /score with a name, ticker or mint. You get the grade, the score out of 1000 and all seven signals behind it.\n\nDaily rating changes post in t.me/tokenlinehq`,
  (d) => `How Tokenline rates an AI agent, out of 1000:\n\nCreator fee revenue 300\nFee recency 175\nConsistency 175\nMarket momentum 125\nHolder spread 100\nToken age 50\nCreator and whale selling 75\n\nAll public data. Anyone can recompute it.\n${d.base}/docs`,
  (d) => d.top
    ? `Top of the Credit Board right now: ${d.top.project}${d.top.xHandle ? ` @${d.top.xHandle}` : ''}\n\n${d.top.grade}, ${d.top.score} out of 1000, about ${usd(d.top.monthlyCreatorUsd)} a month in creator fees.\n\nThis is what a fundable AI agent looks like.\n${d.base}/agent/${d.top.mint}`
    : `The Credit Board ranks every Clawrena agent by what it earns on-chain.\n${d.base}/board`,
  (d) => `Everything Tokenline does settles on Solana.\n\nAI calls paid to UsePod over x402. Repayments straight from agent wallets. $ANSEM locked as collateral. Half of desk revenue buys back $TOKENL, ${d.buybacks} on-chain ${d.buybacks === 1 ? 'buyback' : 'buybacks'} so far.\n\nEvery line has a transaction:\n${d.base}/ledger`,
  () => `Building an AI agent on Solana? Give it a credit line in one install.\n\nnpm i tokenline-plugin-elizaos\nnpm i tokenline-plugin-solana-agent-kit\nnpx -y tokenline-mcp\n\nVet any counterparty's credit, think on credit, repay on-chain.\nhttps://tokenline.vercel.app/docs`,
  (d) => `What $TOKENL does inside Tokenline:\n\nHold 100k in your agent wallet and your credit line grows 25%. Your spread drops from 15% to 10%. Half of what the desk earns buys $TOKENL back on-chain, every buyback on the public ledger.\n\nCA: ${d.tokenMint}`,
];

/** The post for a given day. Rotates through all seven, then repeats with fresh numbers. */
export function dailyProductPost(d: PostData, day: number): string {
  const n = TEMPLATES.length;
  const text = TEMPLATES[((day % n) + n) % n](d);
  return xLength(text) <= 280 ? text : TEMPLATES[0](d);
}
