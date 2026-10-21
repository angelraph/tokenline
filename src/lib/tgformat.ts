// Telegram message text for the Tokenline bot and channel. Pure and dependency-free so tests run the same code.

export type TgRow = {
  rank: number; mint: string; project: string; symbol: string; xHandle: string | null;
  score: number; grade: string; lineUsd: number; monthlyCreatorUsd: number; volume24hUsd: number; stale: boolean;
};
export type TgFactor = { label: string; points: number; max: number };
export type TgMove = { mint: string; project: string; from: number; to: number; delta: number; gradeTo: string; lineTo: number; kind: string };
export type TgPool = { draws: number; drawnUsd: number; repaidUsd: number; reportsSold: number; revenueUsd: number; buybackUsd: number; buybackCount: number };

/** Telegram HTML mode only needs these three escaped. */
export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const usd = (x: number) => `$${Math.round(x).toLocaleString('en-US')}`;
const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const bar = (points: number, max: number) => {
  const n = max ? Math.round((points / max) * 10) : 0;
  return '▰'.repeat(n) + '▱'.repeat(10 - n);
};

/** Find an agent by mint, ticker or name. Exact matches win, then prefixes, then substrings. */
export function findAgent(rows: TgRow[], query: string): TgRow | undefined {
  const q = query.trim().replace(/^\$/, '').toLowerCase();
  if (!q) return undefined;
  return rows.find((r) => r.mint === query.trim())
    ?? rows.find((r) => r.symbol.toLowerCase() === q || r.project.toLowerCase() === q)
    ?? rows.find((r) => r.project.toLowerCase().startsWith(q) || r.symbol.toLowerCase().startsWith(q))
    ?? rows.find((r) => r.project.toLowerCase().includes(q));
}

export function scoreMessage(r: TgRow, factors: TgFactor[], total: number, base: string) {
  const lines = [
    `<b>${esc(r.project)}</b> ($${esc(r.symbol)})`,
    `Grade <b>${esc(r.grade)}</b> · <b>${r.score}</b>/1000 · #${r.rank} of ${total}`,
    '',
    `Creator revenue: ${usd(r.monthlyCreatorUsd)}/month`,
    `24h volume: ${usd(r.volume24hUsd)}`,
    r.lineUsd > 0 ? `Pre-approved line: <b>$${r.lineUsd.toFixed(2)}</b> of AI compute on credit` : r.stale ? 'Line paused: no fees for over a week' : 'No credit line yet',
  ];
  if (factors.length) {
    lines.push('');
    for (const f of factors) lines.push(`<code>${bar(f.points, f.max)}</code> ${esc(f.label)} ${f.points}/${f.max}`);
  }
  lines.push('', `Full report: ${base}/agent/${r.mint}`);
  return lines.join('\n');
}

export function topMessage(rows: TgRow[], base: string, n = 5) {
  const top = rows.slice(0, n).map((r) => `${r.rank}. <b>${esc(r.project)}</b> · ${esc(r.grade)} ${r.score} · line $${r.lineUsd.toFixed(2)}`);
  const approved = rows.filter((r) => r.lineUsd > 0).length;
  return [`<b>Top rated Clawrena agents</b>`, '', ...top, '', `${approved} of ${rows.length} agents are pre-approved for compute on credit.`, `${base}/board`].join('\n');
}

export function watchMessage(moves: TgMove[], rows: TgRow[], base: string, n = 6) {
  if (!moves.length) return `No rating changes in the last day yet. The board re-rates every agent hourly.\n${base}/watch`;
  const name = new Map(rows.map((r) => [r.mint, r.project]));
  const label: Record<string, string> = { upgrade: 'up', downgrade: 'down', newly_approved: 'new line', line_pulled: 'line paused' };
  const list = moves.slice(0, n).map((m) => `${esc(name.get(m.mint) ?? m.project)}: ${label[m.kind] ?? m.kind}, ${m.from} to ${m.to} (${sign(m.delta)})`);
  return [`<b>Credit Watch, last 24h</b>`, '', ...list, moves.length > n ? `\n…and ${moves.length - n} more` : '', `${base}/watch`].filter((l) => l !== '').join('\n');
}

export function ledgerMessage(p: TgPool, base: string) {
  return [
    `<b>Tokenline ledger</b>, every line on-chain`,
    '',
    `Calls on credit: ${p.draws} ($${p.drawnUsd.toFixed(4)} of compute fronted)`,
    `Repaid: $${p.repaidUsd.toFixed(2)}`,
    `Credit reports sold: ${p.reportsSold}`,
    `Desk revenue: $${p.revenueUsd.toFixed(4)}`,
    `$TOKENL bought back: $${p.buybackUsd.toFixed(2)} in ${p.buybackCount} on-chain ${p.buybackCount === 1 ? 'swap' : 'swaps'}`,
    '',
    `${base}/ledger`,
  ].join('\n');
}

export function tokenMessage(mint: string, base: string) {
  return [
    `<b>$TOKENL</b>`,
    '',
    `CA: <code>${esc(mint)}</code>`,
    '',
    'Hold 100k+ in your agent wallet for a 25% bigger credit line and a 10% spread instead of 15%. Half of desk revenue buys $TOKENL back on-chain.',
    '',
    `Chart: https://dexscreener.com/solana/${mint}`,
    `Buybacks: ${base}/ledger`,
  ].join('\n');
}

export function helpMessage(base: string) {
  return [
    '<b>Tokenline</b> rates every Clawrena agent from its on-chain creator fees and lends it AI compute on credit.',
    '',
    '/score <i>name, ticker or mint</i> · credit report for any agent',
    '/top · top rated agents',
    '/watch · upgrades and downgrades today',
    '/ledger · draws, repayments and buybacks',
    '/token · $TOKENL contract and links',
    '/alerts · live alerts for $TOKENL holders',
    '',
    `Open a credit line: ${base}/apply`,
  ].join('\n');
}

/** Daily channel post: the Credit Watch digest on good days, otherwise a board snapshot. Never empty. */
export function dailyMessage(digest: string[], rows: TgRow[], base: string) {
  if (digest.length) return esc(digest.join('\n\n'));
  const approved = rows.filter((r) => r.lineUsd > 0).length;
  const top = rows.slice(0, 3).map((r) => `${r.rank}. <b>${esc(r.project)}</b> · ${esc(r.grade)} ${r.score}`);
  return [`<b>Daily Credit Board</b>`, '', ...top, '', `${rows.length} Clawrena agents rated from on-chain fees, ${approved} pre-approved for compute on credit.`, `${base}/board`].join('\n');
}
