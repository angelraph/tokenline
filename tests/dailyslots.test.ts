import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyProductPost, eveningPost, MAX_POST, middayInsightPost, xLength, type EveningData, type InsightData, type PostData } from '../src/lib/dailypost.ts';
import { recentShip } from '../src/lib/changelog.ts';

const DASHES = new RegExp(`[${String.fromCharCode(0x2014)}${String.fromCharCode(0x2013)}]`);
const top3 = [{ project: 'SelfMade by SP3ND', grade: 'AAA', score: 963 }, { project: 'Shinjuku StAItion', grade: 'AAA', score: 948 }, { project: 'Hot Bot', grade: 'AAA', score: 929 }];

const d: PostData = {
  base: 'https://tokenline.online', agents: 219, approved: 35, trading: 37,
  top: { project: 'SelfMade by SP3ND', xHandle: 'SP3NDdotshop', grade: 'AAA', score: 960, monthlyCreatorUsd: 87988.4, mint: 'E'.repeat(44) },
  draws: 3, buybacks: 1, tokenMint: '4sfvc4dHviSKG33KnT6ZvecXtUpvqtE4Nb4Stkj2S9Ya', top3,
};
const ins: InsightData = {
  base: 'https://tokenline.online', trading: 37, approved: 35, aaa: 14, totalVol24: 612_345.6, top3,
  busiest: { project: 'Hot Bot', xHandle: 'usehotbot', grade: 'AAA', vol24: 430_760, mint: 'H'.repeat(44) },
  upgrade: { project: 'corine', xHandle: 'corinedotin', from: 840, to: 914, grade: 'AAA', mint: 'C'.repeat(44) },
};
const eve: EveningData = { base: 'https://tokenline.online', shipped: null, draws: 3, repaidUsd: 0.98, reportsSold: 1, buybacks: 2, buybackUsd: 0.12 };

test('midday posts rotate through real data angles and fit the long-post limit', () => {
  const week = Array.from({ length: 4 }, (_, i) => middayInsightPost(ins, i));
  assert.equal(new Set(week).size, 4);
  for (const p of week) { assert.ok(xLength(p) <= MAX_POST, p); assert.doesNotMatch(p, DASHES); }
  const all = week.join('\n');
  assert.match(all, /Hot Bot @usehotbot was the busiest agent .*: \$430,760 traded, rated AAA/);
  assert.match(all, /corine @corinedotin just moved up on the Tokenline Credit Board: 840 to 914, now rated AAA/);
  assert.match(all, /\$612,346 traded across all agents\n37 agents actively trading\n14 rated AAA\n35 with a credit line open/);
  assert.match(all, /1\. SelfMade by SP3ND, AAA 963/);
});

test('midday skips angles with no data instead of inventing one', () => {
  const quiet = { ...ins, busiest: null, upgrade: null };
  for (let i = 0; i < 8; i++) {
    const p = middayInsightPost(quiet, i);
    assert.doesNotMatch(p, /busiest agent|just moved up/);
  }
});

test('evening announces a real ship for 36 hours, otherwise a ledger receipt', () => {
  assert.match(eveningPost({ ...eve, shipped: 'Something real shipped.' }, 0), /^Shipped on Tokenline today:\n\nSomething real shipped\./);
  const receipts = Array.from({ length: 3 }, (_, i) => eveningPost(eve, i));
  assert.equal(new Set(receipts).size, 3);
  for (const p of receipts) { assert.ok(xLength(p) <= MAX_POST, p); assert.doesNotMatch(p, DASHES); }
  assert.match(receipts.join('\n'), /\$0\.98 repaid straight from agent wallets/);
  assert.doesNotMatch(receipts.join('\n'), /\$0 in total/);
  assert.equal(recentShip(Date.parse('2026-10-21T10:00:00Z'))?.startsWith('Holder alerts'), true);
  assert.equal(recentShip(Date.parse('2026-10-21T07:00:00Z'))?.startsWith('Live trading activity'), true);
  assert.equal(recentShip(Date.parse('2026-12-01T00:00:00Z')), null);
});

test('no hype or price words in any slot', () => {
  const all = [
    ...Array.from({ length: 7 }, (_, i) => dailyProductPost(d, i)),
    ...Array.from({ length: 4 }, (_, i) => middayInsightPost(ins, i)),
    ...Array.from({ length: 3 }, (_, i) => eveningPost(eve, i)),
  ].join('\n').toLowerCase();
  for (const w of ['100x', 'moon', 'guaranteed', 'pump', 'price target', 'financial advice']) assert.ok(!new RegExp(`(^|[^a-z])${w}([^a-z]|$)`).test(all), w);
});
