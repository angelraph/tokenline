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
  /** The top three agents on the board right now. */
  top3?: { project: string; grade: string; score: number }[];
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
  /** The top three agents on the board right now. */
  top3?: { project: string; grade: string; score: number }[];
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
/** Long-form posts for a verified X account: room to explain, still short enough to read in one go. */
export const MAX_POST = 2000;
const podium = (t?: { project: string; grade: string; score: number }[]) =>
  (t ?? []).slice(0, 3).map((a, i) => `${i + 1}. ${a.project}, ${a.grade} ${a.score}`).join('\n');
const pick = <T,>(list: T[], seed: number) => list[((seed % list.length) + list.length) % list.length];

const PRODUCT: ((d: PostData) => string)[] = [
  (d) => `Most AI agents can't get credit for the same reason most startups can't: nobody can see what they earn.

On-chain, you can.

Tokenline rates every agent in the ClawPump arena from the money it actually makes. Creator fees, how recently and how steadily they arrive, real trading, how the token is held, and whether the creator or the big wallets are quietly selling. One score out of 1000, re-rated every hour, and anyone can recompute it.

Right now that's ${d.agents} agents rated, and ${d.approved} of them have a credit line waiting: AI compute on credit, paid back from their own fees.
${d.top3?.length ? `\nTop of the board today:\n${podium(d.top3)}\n` : ''}
Find your agent:
${d.base}/board`,
  () => `You shouldn't need a dashboard to check whether an AI agent is good for it.

Message @tokenhqbot on Telegram and send /score with any agent's name, ticker or mint. In two seconds you get its grade, its score out of 1000 and the seven on-chain signals behind it, with a link to the full report.

/top shows the strongest agents right now. /watch shows who moved today.

And if you hold 100k $TOKENL, /alerts turns on live alerts for upgrades, new credit lines and volume spikes, the moment they happen.

Daily rating changes also post in t.me/tokenlinehq`,
  (d) => `How Tokenline decides whether an AI agent is creditworthy, in plain terms:

Creator fee revenue (300): how much it earns, as a monthly run-rate.
Fee recency (175): is it still earning this week, or did it go quiet?
Consistency (175): steady income beats one lucky day.
Market momentum (125): real trading volume today.
Holder spread (100): is the token held widely, or by a handful of wallets?
Token age (50): time survived in the market.
Creator and whale selling (75): are insiders heading for the exit?

1000 points, all from public data, re-scored every hour. Nothing is self-reported, and anyone can recompute every number.

The full method:
${d.base}/docs`,
  (d) => d.top
    ? `What a fundable AI agent looks like, by the numbers.

${who(d.top)} sits at #1 on the Tokenline Credit Board: ${d.top.grade}, ${d.top.score} out of 1000, earning about ${usd(d.top.monthlyCreatorUsd)} a month in creator fees.

That score isn't an opinion. It comes from fees paid on-chain, how consistently they arrive, real trading and who holds the token. When the AnsemHack winners were announced, all four were already in this board's top five.

If agents are going to borrow, hire and pay each other, records like this will decide who gets trusted first.

Full report:
${d.base}/agent/${d.top.mint}`
    : `The Tokenline Credit Board ranks every ClawPump agent by what it actually earns on-chain.\n\n${d.base}/board`,
  (d) => `Most AI crypto projects show you a roadmap. Tokenline shows you transactions.

Every part of the product settles on Solana:

An agent asks for AI compute, and the pool pays UsePod for that exact call over x402.
The agent repays in SOL from its own wallet, and it's credited within seconds.
$ANSEM gets locked as collateral to raise a line.
Other agents buy credit reports for two cents, also over x402.
And $TOKENL gets bought back on the open market, ${d.buybacks} ${d.buybacks === 1 ? 'time' : 'times'} so far.

Every one of those has a transaction you can open:
${d.base}/ledger`,
  (d) => `If you're building an AI agent on Solana, it can have a credit line in one install.

ElizaOS: npm i tokenline-plugin-elizaos
Solana Agent Kit: npm i tokenline-plugin-solana-agent-kit
Claude and any MCP client: npx -y tokenline-mcp

Your agent can check any counterparty's credit before it deals with them, think on credit through an OpenAI or Anthropic compatible endpoint, and repay on-chain from its own wallet.

Docs and examples:
${d.base}/docs`,
  (d) => `What $TOKENL actually does inside Tokenline:

Hold 100k in your agent wallet and your credit line grows 25%.
Your spread on every AI call drops from 15% to 10%.
Holders get live Telegram alerts on upgrades, new credit lines and volume spikes.
Half of what the desk earns, plus a share of every creator fee, buys $TOKENL back on the open market, and every buyback sits on a public ledger.

Utility first, receipts always.

CA: ${d.tokenMint}
${d.base}`,
];

const INSIGHT: ((d: InsightData) => string | null)[] = [
  (d) => d.busiest
    ? `${who(d.busiest)} was the busiest agent in the ClawPump arena over the last 24 hours: ${usd(d.busiest.vol24)} traded, rated ${d.busiest.grade} on Tokenline.

Every one of those trades paid its creator a fee, and that is exactly the kind of income a credit line can be built on. Volume alone doesn't make an agent creditworthy, but steady volume on top of real creator revenue is what the top of the board has in common.

Full credit report:
${d.base}/agent/${d.busiest.mint}`
    : null,
  (d) => d.upgrade
    ? `${who(d.upgrade)} just moved up on the Tokenline Credit Board: ${d.upgrade.from} to ${d.upgrade.to}, now rated ${d.upgrade.grade}.

Scores here aren't voted on or paid for. They move when an agent earns more, earns more steadily, trades more, or when its holders look healthier. So an upgrade means something changed on-chain, and the report shows exactly what.

${d.base}/agent/${d.upgrade.mint}`
    : null,
  (d) => `The ClawPump arena over the last 24 hours, by the numbers:

${usd(d.totalVol24)} traded across all agents
${d.trading} agents actively trading
${d.aaa} rated AAA
${d.approved} with a credit line open on Tokenline
${d.top3?.length ? `\nTop three right now:\n${podium(d.top3)}\n` : ''}
Live board, re-rated every hour:
${d.base}/board`,
  (d) => `${d.aaa} AI agents hold an AAA credit rating on Tokenline today.

AAA isn't a badge anyone can buy. It means steady, recent creator revenue, real trading, a healthy spread of holders and no sign of insiders heading for the exit, all measured on-chain.
${d.top3?.length ? `\nToday's list starts with:\n${podium(d.top3)}\n` : ''}
See every rating:
${d.base}/board`,
];

const RECEIPTS: ((d: EveningData) => string)[] = [
  (d) => `Where Tokenline stands, on the record:

${d.draws} AI calls run on credit and paid to UsePod over x402
$${d.repaidUsd.toFixed(2)} repaid straight from agent wallets
${d.reportsSold} credit ${d.reportsSold === 1 ? 'report' : 'reports'} sold to other agents over x402
${d.buybacks} $TOKENL ${d.buybacks === 1 ? 'buyback' : 'buybacks'} on the open market

Small numbers, real ones. Every line above is a Solana transaction you can open, and that's the standard we hold ourselves to as it grows.

${d.base}/ledger`,
  (d) => `Two things buy $TOKENL back, automatically and on the record.

Half of what the Tokenline desk earns goes back into $TOKENL. And a share of every creator fee the token earns is routed through ClawPump into automatic buybacks, with no one needing to remember to press a button.

${d.buybacks} ${d.buybacks === 1 ? 'buyback' : 'buybacks'} so far${d.buybackUsd >= 10 ? `, ${usd(d.buybackUsd)} in total` : ''}, each one linked to its transaction on the public ledger.

${d.base}/ledger`,
  (d) => `Tokenline lives where AI agents already are.

Telegram: message @tokenhqbot for any agent's credit report.
MCP: one URL gives Claude and other agent clients six credit tools.
npm: plugins for ElizaOS and Solana Agent Kit.
OpenAI and Anthropic compatible endpoints: point an existing agent at Tokenline and it thinks on credit.
Blinks: repay or lock $ANSEM from any Solana wallet.

${d.base}/docs`,
];

/** Morning: what Tokenline does, a new angle each day. */
export function dailyProductPost(d: PostData, day: number): string {
  const text = pick(PRODUCT, day)(d);
  return xLength(text) <= MAX_POST ? text : PRODUCT[0](d);
}

/** Midday: something true that happened on-chain today. Skips angles with no data. */
export function middayInsightPost(d: InsightData, day: number): string {
  for (let k = 0; k < INSIGHT.length; k++) {
    const text = pick(INSIGHT, day + k)(d);
    if (text && xLength(text) <= MAX_POST) return text;
  }
  return INSIGHT[2](d)!;
}

/** Evening: what shipped, or a receipt from the ledger. */
export function eveningPost(d: EveningData, day: number): string {
  if (d.shipped) {
    const text = `Shipped on Tokenline today:\n\n${d.shipped}\n\nWe build in public, and every feature goes live on Solana mainnet the day it ships. See it working:\n${d.base}`;
    if (xLength(text) <= MAX_POST) return text;
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
