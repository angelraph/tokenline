// Three posts a day for @tokenlinehq and the Telegram channel, written from live numbers.
// Pure and dependency-free so tests run the same code. Never price: every claim links to something checkable.

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

export type InsightData = {
  base: string;
  trading: number;
  approved: number;
  aaa: number;
  totalVol24: number;
  /** Highest 24h volume today. */
  busiest: { project: string; xHandle: string | null; grade: string; vol24: number; mint: string } | null;
  /** Largest score upgrade in the last day, if any. */
  upgrade: { project: string; xHandle: string | null; from: number; to: number; grade: string; mint: string } | null;
};

export type EveningData = {
  base: string;
  /** What shipped, when the current deployment is less than 36 hours old. */
  shipped: string | null;
  draws: number;
  repaidUsd: number;
  reportsSold: number;
  buybacks: number;
  buybackUsd: number;
};

const usd = (x: number) => `$${Math.round(x).toLocaleString('en-US')}`;
const who = (x: { project: string; xHandle: string | null }) => (x.xHandle ? `${x.project} @${x.xHandle}` : x.project);
export const xLength = (s: string) => s.replace(/https?:\/\/\S+/g, 'x'.repeat(23)).length;
const pick = <T,>(list: T[], seed: number) => list[((seed % list.length) + list.length) % list.length];

const PRODUCT: ((d: PostData) => string)[] = [
  (d) => `Every agent in the Clawrena arena has a credit score.\n\n${d.agents} AI agents rated from what they actually earn on-chain. ${d.approved} of them are pre-approved to run AI compute on credit and repay from their fees.\n\nFind yours:\n${d.base}/board`,
  () => `Check any AI agent's credit without leaving Telegram.\n\nDM @tokenhqbot and send /score with a name, ticker or mint. You get the grade, the score out of 1000 and all seven signals behind it.\n\nDaily rating changes post in t.me/tokenlinehq`,
  (d) => `How Tokenline rates an AI agent, out of 1000:\n\nCreator fee revenue 300\nFee recency 175\nConsistency 175\nMarket momentum 125\nHolder spread 100\nToken age 50\nCreator and whale selling 75\n\nAll public data. Anyone can recompute it.\n${d.base}/docs`,
  (d) => d.top
    ? `Top of the Credit Board right now: ${who(d.top)}\n\n${d.top.grade}, ${d.top.score} out of 1000, about ${usd(d.top.monthlyCreatorUsd)} a month in creator fees.\n\nThis is what a fundable AI agent looks like.\n${d.base}/agent/${d.top.mint}`
    : `The Credit Board ranks every Clawrena agent by what it earns on-chain.\n${d.base}/board`,
  (d) => `Everything Tokenline does settles on Solana.\n\nAI calls paid to UsePod over x402. Repayments straight from agent wallets. $ANSEM locked as collateral. Half of desk revenue buys back $TOKENL, ${d.buybacks} on-chain ${d.buybacks === 1 ? 'buyback' : 'buybacks'} so far.\n\nEvery line has a transaction:\n${d.base}/ledger`,
  (d) => `Building an AI agent on Solana? Give it a credit line in one install.\n\nnpm i tokenline-plugin-elizaos\nnpm i tokenline-plugin-solana-agent-kit\nnpx -y tokenline-mcp\n\nVet any counterparty's credit, think on credit, repay on-chain.\n${d.base}/docs`,
  (d) => `What $TOKENL does inside Tokenline:\n\nHold 100k in your agent wallet and your credit line grows 25%. Your spread drops from 15% to 10%. Half of what the desk earns buys $TOKENL back on-chain, every buyback on the public ledger.\n\nCA: ${d.tokenMint}`,
];

const INSIGHT: ((d: InsightData) => string | null)[] = [
  (d) => d.busiest
    ? `Busiest Clawrena agent in the last 24h: ${who(d.busiest)}\n\n${usd(d.busiest.vol24)} of trading volume, rated ${d.busiest.grade}. Every one of those trades paid its creator.\n\nFull credit report:\n${d.base}/agent/${d.busiest.mint}`
    : null,
  (d) => d.upgrade
    ? `Upgrade on the Credit Board: ${who(d.upgrade)} climbed from ${d.upgrade.from} to ${d.upgrade.to} and now rates ${d.upgrade.grade}.\n\nScores move with what an agent actually earns and how it trades. Nothing self-reported.\n${d.base}/agent/${d.upgrade.mint}`
    : null,
  (d) => `Clawrena agents traded ${usd(d.totalVol24)} in the last 24h.\n\n${d.trading} agents were active, ${d.aaa} hold an AAA rating and ${d.approved} have a credit line open on Tokenline.\n\nLive board, re-rated hourly:\n${d.base}/board`,
  (d) => `${d.aaa} AI agents hold an AAA credit rating today.\n\nAAA means steady, recent creator revenue and real trading, measured on-chain. It is the closest thing the agent economy has to an investment grade.\n${d.base}/board`,
];

const RECEIPTS: ((d: EveningData) => string)[] = [
  (d) => `Tokenline receipts so far:\n\n${d.draws} AI calls run on credit and paid to UsePod over x402\n$${d.repaidUsd.toFixed(2)} repaid from agent wallets\n${d.reportsSold} credit ${d.reportsSold === 1 ? 'report' : 'reports'} sold over x402\n\nEvery one has a Solana transaction:\n${d.base}/ledger`,
  (d) => `The $TOKENL flywheel, on the record:\n\nHalf of desk revenue goes to buying $TOKENL on the open market. ${d.buybacks} ${d.buybacks === 1 ? 'buyback' : 'buybacks'} so far, ${usd(d.buybackUsd)} in total, each one linked to its transaction.\n\n${d.base}/ledger`,
  (d) => `Tokenline runs where agents already are.\n\nTelegram: @tokenhqbot for any agent's credit\nMCP: one URL for Claude and other agent clients\nnpm: ElizaOS and Solana Agent Kit plugins\nBlinks: repay and lock $ANSEM from any wallet\n\n${d.base}/docs`,
];

/** Morning: what Tokenline does, a new angle each day. */
export function dailyProductPost(d: PostData, day: number): string {
  const text = pick(PRODUCT, day)(d);
  return xLength(text) <= 280 ? text : PRODUCT[0](d);
}

/** Midday: something true that happened on-chain today. Skips angles with no data. */
export function middayInsightPost(d: InsightData, day: number): string {
  for (let k = 0; k < INSIGHT.length; k++) {
    const text = pick(INSIGHT, day + k)(d);
    if (text && xLength(text) <= 280) return text;
  }
  return INSIGHT[2](d)!;
}

/** Evening: what shipped, or a receipt from the ledger. */
export function eveningPost(d: EveningData, day: number): string {
  if (d.shipped) {
    const text = `Shipped on Tokenline today:\n\n${d.shipped}\n\nLive now:\n${d.base}`;
    if (xLength(text) <= 280) return text;
  }
  return pick(RECEIPTS, day)(d);
}

export type BuybackData = { amount: number; usd: number; signature: string; isTokenl: boolean; source?: 'pool' | 'clawpump'; burned?: boolean };

/** Receipt for a buyback the pool wallet just signed. Real amounts and the transaction only. */
export function buybackReceipt(b: BuybackData, creatorPct: number | null): string {
  const qty = Math.round(b.amount).toLocaleString('en-US');
  const what = b.isTokenl ? '$TOKENL' : '$ANSEM';
  const rule = creatorPct ? `\n\nThat is part of the ${creatorPct}% of creator fees we put back into ${what}, as promised.` : '';
  return `Buyback done: ${qty} ${what} (${b.usd < 100 ? '$' + b.usd.toFixed(2) : usd(b.usd)}) ${b.burned ? 'bought and burned' : 'bought on the open market'}, ${b.source === 'clawpump' ? 'automatically from creator fees' : 'signed by the Tokenline pool wallet'}.${rule}\n\nOn-chain:\nhttps://solscan.io/tx/${b.signature}`;
}

/** The one-off post that states the creator-fee buyback rule. Only shown once the rule is set. */
export function buybackAnnouncement(creatorPct: number, base: string): string {
  return `New rule for $TOKENL: ${creatorPct}% of Tokenline's creator fees buys $TOKENL on the open market.\n\nEvery buyback happens on-chain and lands on the public ledger with its transaction.\n\nReceipts:\n${base}/ledger`;
}
