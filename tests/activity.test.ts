import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVE_MIN_USD, hoursSinceActive, nextActivity } from '../src/lib/activitycore.ts';
import { scoreAgent } from '../src/lib/score.ts';

const H = 3_600_000;
const close = Date.parse('2026-10-09T03:59:59Z');
const today = Date.parse('2026-10-20T15:00:00Z');
const policy = { baseLineCapUsd: 0.5, staleDays: 7 };
const base = {
  grossFeesSol: 1000, platformFeesSol: 330, collections: 800,
  firstFeeAt: '2026-08-20T00:00:00Z', lastFeeAt: '2026-10-09T03:55:00Z',
  volume24hUsd: 150_000, solPriceUsd: 120, now: close,
};

test('real trading marks the token active; dust does not', () => {
  assert.equal(nextActivity(undefined, ACTIVE_MIN_USD, today).activeAt, today);
  assert.equal(nextActivity(undefined, 3, today).activeAt, null);
  const was = nextActivity(undefined, 900, today - 30 * H);
  assert.equal(nextActivity(was, 0, today).activeAt, today - 30 * H);
});

test('hours since active fall back to the last recorded fee before tracking began', () => {
  assert.equal(hoursSinceActive({ vol24: 0, activeAt: null, checkedAt: today }, today - 48 * H), 48);
  assert.equal(hoursSinceActive({ vol24: 900, activeAt: today, checkedAt: today }, today - 500 * H), 0);
});

test('an agent still trading keeps its recency and line after the feed closed', () => {
  const s = scoreAgent({ ...base, live: { vol24: 40_000, activeAt: today, checkedAt: today } }, policy);
  const recency = s.components.find((c) => c.key === 'recency')!;
  assert.equal(recency.points, 175);
  assert.match(recency.detail, /trading in the last 24h \(live\)/);
  assert.match(s.components.find((c) => c.key === 'momentum')!.detail, /\$40,000 24h volume \(live\)/);
  assert.equal(s.stale, false);
  assert.ok(s.lineUsd > 0);
});

test('an agent that stopped trading loses recency and its line', () => {
  const s = scoreAgent({ ...base, live: { vol24: 0, activeAt: null, checkedAt: today } }, policy);
  assert.equal(s.components.find((c) => c.key === 'recency')!.points, 0);
  assert.equal(s.stale, true);
  assert.equal(s.lineUsd, 0);
});

test('revenue still comes from the recorded fee history, not live volume', () => {
  const a = scoreAgent({ ...base, live: { vol24: 40_000, activeAt: today, checkedAt: today } }, policy);
  const b = scoreAgent({ ...base, live: { vol24: 400, activeAt: today, checkedAt: today } }, policy);
  assert.equal(a.monthlyCreatorUsd, b.monthlyCreatorUsd);
});
