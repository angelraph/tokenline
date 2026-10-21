const num = (v: string | undefined, d: number) => (v && !Number.isNaN(Number(v)) ? Number(v) : d);

/** Reads a percent written as 25, 25% or " 25 "; anything else, or outside 1 to 100, means unset. */
const pct = (v: string | undefined) => {
  const n = parseFloat(String(v ?? '').replace('%', '').trim());
  return Number.isFinite(n) && n > 0 && n <= 100 ? n : null;
};

export const config = {
  baseUrl: process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL || '',
  usepod: {
    token: process.env.USEPOD_PROXY_TOKEN || '',
    base: process.env.USEPOD_BASE_URL || 'https://api.usepod.ai/proxy',
    memoModel: process.env.MEMO_MODEL || 'deepseek-v4-1-flash',
    // Hot wallet that pays UsePod per request (x402). Keep only a few cents in it.
    spenderSecret: process.env.SPENDER_SECRET_KEY || '',
  },
  heliusKey: process.env.HELIUS_API_KEY || '',
  poolWallet: process.env.POOL_WALLET || '',
  escrowWallet: process.env.ESCROW_WALLET || process.env.POOL_WALLET || '',
  mints: {
    ansem: process.env.ANSEM_MINT || '9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump',
    tline: process.env.TLINE_MINT || '',
    usdc: process.env.USDC_MINT || 'EPjFWJ5vKuqjqCWQyeAJsbRUPkCmtD2CHAANnUQwDRx4',
  },
  policy: {
    spreadBps: num(process.env.SPREAD_BPS, 1500),
    /** Spread for agents whose wallet holds at least holderMin $TOKENL. */
    holderSpreadBps: num(process.env.TLINE_HOLDER_SPREAD_BPS, 1000),
    baseLineCapUsd: num(process.env.BASE_LINE_CAP_USD, 25),
    collateralLtv: num(process.env.COLLATERAL_LTV, 0.5),
    holderBoost: num(process.env.TLINE_HOLDER_BOOST, 0.25),
    holderMin: num(process.env.TLINE_HOLDER_MIN, 100_000),
    /** Share of desk revenue (spread + report sales) committed to buying back $TOKENL / $ANSEM. */
    buybackShare: num(process.env.BUYBACK_SHARE, 0.5),
    /** Public rule: this percent of each creator-fee withdrawal buys $TOKENL. Unset until the creator commits to one. */
    creatorBuybackPct: pct(process.env.CREATOR_BUYBACK_PCT),
    // Days of silence (no fee collections) before an unsecured line is frozen.
    staleDays: 7,
    // Outstanding debt older than this with no repayment marks the agent overdue.
    overdueDays: 14,
  },
  xHandle: process.env.X_HANDLE || 'tokenlinehq',
  /** X API user keys for @tokenlinehq (OAuth 1.0a, read and write). Only the Credit Watch bot uses them. */
  /** Post the daily Credit Watch thread through the X API (needs paid X credits). Otherwise it is saved as a draft for the operator. */
  xAutopost: process.env.X_AUTOPOST === '1',
  /** The token's ClawPump wallet, which runs ClawPump's auto-buyback from creator fees. */
  autoBuybackWallet: (process.env.AUTO_BUYBACK_WALLET || 'Pt2XMXdFesf3Wb5VafNVikvSQDGtsN1kdhRgWJ7MUF6').trim(),
  /** When auto-buyback was switched on; nothing before this counts as a buyback. */
  autoBuybackSince: Date.parse(process.env.AUTO_BUYBACK_SINCE || '2026-10-21T07:00:00Z'),
  /** Telegram bot (free API). The channel gets the daily digest; the bot answers /score and friends. */
  telegram: {
    token: (process.env.TELEGRAM_BOT_TOKEN || '').trim(),
    channel: (process.env.TELEGRAM_CHANNEL || '').trim(),
  },
  xApi: {
    consumerKey: (process.env.X_API_KEY || '').trim(),
    consumerSecret: (process.env.X_API_SECRET || '').trim(),
    token: (process.env.X_ACCESS_TOKEN || '').trim(),
    tokenSecret: (process.env.X_ACCESS_SECRET || '').trim(),
  },
  /** Price of one machine-readable credit report sold over x402. */
  reportPriceUsd: num(process.env.REPORT_PRICE_USD, 0.02),
  /** Signs x402 quotes so they can't be forged or replayed after expiry. */
  quoteSecret: process.env.QUOTE_SECRET || process.env.ADMIN_TOKEN || '',
  adminToken: process.env.ADMIN_TOKEN || '',
  cronSecret: process.env.CRON_SECRET || '',
};

export const CLAWRENA_FEED = 'https://clawpump.tech/api/ansemhack/fees';
