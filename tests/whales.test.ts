import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreAgent } from '../src/lib/score.ts';
import { whaleExit } from '../src/lib/whales.ts';

const policy = { baseLineCapUsd: 25, staleDays: 7 };
const now = Date.parse('2026-09-29T12:00:00Z');
const base = {
  grossFeesSol: 1500, platformFeesSol: 500, collections: 780,
  firstFeeAt: '2026-08-20T00:00:00Z', lastFeeAt: '2026-09-29T11:00:00Z',
  volume24hUsd: 170_000, solPriceUsd: 118, now,
};

test('no previous measurement means no exit estimate yet', () => {
  assert.equal(whaleExit(undefined, { a: 10 }, 1, 1000), undefined);
});

test('no real wallets to follow means unknown, not "held"', () => {
  assert.equal(whaleExit({}, { a: 10 }, 1, 1000), undefined);
});

test('a whale selling part of its bag is counted as a share of supply', () => {
  assert.equal(whaleExit({ a: 100, b: 50 }, { a: 60, b: 50 }, 5, 1000), 0.04);
});

test('a whale that left the list is assumed to hold at most the list floor', () => {
  // b held 50 and dropped out; it holds at most 5 now, so at least 45 was sold.
  assert.equal(whaleExit({ b: 50 }, { a: 100 }, 5, 1000), 0.045);
});

test('buying more never counts as an exit', () => {
  assert.equal(whaleExit({ a: 100 }, { a: 150 }, 5, 1000), 0);
});

test('the factor uses the worse of creator sells and whale exits', () => {
  const dev = (i: object) => scoreAgent({ ...base, ...i }, policy).components.find((c) => c.key === 'dev')!;
  assert.equal(dev({ devSoldShare: 0, whaleExitShare: 0 }).points, 75);
  assert.equal(dev({ devSoldShare: 0, whaleExitShare: 0.1 }).points, 0);
  assert.equal(dev({ devSoldShare: 0.05 }).points, dev({ whaleExitShare: 0.05 }).points);
  assert.match(dev({ devSoldShare: 0, whaleExitShare: 0.02 }).detail, /creator has not sold; top wallets sold 2\.00%/);
});
