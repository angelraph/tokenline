const num = (v: string | undefined, d: number) => (v && !Number.isNaN(Number(v)) ? Number(v) : d);

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
    // Days of silence (no fee collections) before an unsecured line is frozen.
    staleDays: 7,
    // Outstanding debt older than this with no repayment marks the agent overdue.
    overdueDays: 14,
  },
  xHandle: process.env.X_HANDLE || 'tokenlinehq',
  /** Price of one machine-readable credit report sold over x402. */
  reportPriceUsd: num(process.env.REPORT_PRICE_USD, 0.02),
  /** Signs x402 quotes so they can't be forged or replayed after expiry. */
  quoteSecret: process.env.QUOTE_SECRET || process.env.ADMIN_TOKEN || '',
  adminToken: process.env.ADMIN_TOKEN || '',
  cronSecret: process.env.CRON_SECRET || '',
};

export const CLAWRENA_FEED = 'https://clawpump.tech/api/ansemhack/fees';
