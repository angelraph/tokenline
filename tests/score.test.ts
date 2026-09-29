import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreAgent, gradeFor } from '../src/lib/score.ts';

const policy = { baseLineCapUsd: 25, staleDays: 7 };
const now = Date.parse('2026-09-29T12:00:00Z');

const strong = {
  grossFeesSol: 1500, platformFeesSol: 500, collections: 780,
  firstFeeAt: '2026-08-20T00:00:00Z', lastFeeAt: '2026-09-29T11:00:00Z',
  volume24hUsd: 170_000, solPriceUsd: 118, now,
};

test('strong earner gets a high grade and a capped line', () => {
  const r = scoreAgent(strong, policy);
  assert.ok(r.score >= 800, `score ${r.score}`);
  assert.equal(r.grade, 'AAA');
  assert.ok(r.lineUsd > 20 && r.lineUsd <= 25);
});

test('no fees means grade C and no unsecured line', () => {
  const r = scoreAgent({ ...strong, grossFeesSol: 0, platformFeesSol: 0, collections: 0,
    firstFeeAt: null, lastFeeAt: null, volume24hUsd: 0 }, policy);
  assert.equal(r.grade, 'C');
  assert.equal(r.lineUsd, 0);
});

test('silent for longer than staleDays freezes the line', () => {
  const r = scoreAgent({ ...strong, lastFeeAt: '2026-09-10T00:00:00Z' }, policy);
  assert.equal(r.stale, true);
  assert.equal(r.lineUsd, 0);
});

test('overdue history knocks 300 points off', () => {
  const base = scoreAgent(strong, policy).score;
  const r = scoreAgent({ ...strong, history: { drawnUsd: 10, repaidUsd: 0, overdue: true } }, policy);
  assert.equal(r.score, Math.max(0, base - 300));
});

test('concentrated holders score lower than distributed ones', () => {
  const a = scoreAgent({ ...strong, top10Share: 0.9 }, policy).score;
  const b = scoreAgent({ ...strong, top10Share: 0.15 }, policy).score;
  assert.ok(b > a);
});

test('grade boundaries', () => {
  assert.equal(gradeFor(800), 'AAA');
  assert.equal(gradeFor(299), 'C');
  assert.equal(gradeFor(300), 'B');
});
