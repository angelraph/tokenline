import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyProductPost, xLength, type PostData } from '../src/lib/dailypost.ts';

const d: PostData = {
  base: 'https://tokenline.vercel.app', agents: 219, approved: 35, trading: 37,
  top: { project: 'SelfMade by SP3ND', xHandle: 'SP3NDdotshop', grade: 'AAA', score: 960, monthlyCreatorUsd: 87988.4, mint: 'E'.repeat(44) },
  draws: 3, buybacks: 1, tokenMint: '4sfvc4dHviSKG33KnT6ZvecXtUpvqtE4Nb4Stkj2S9Ya',
};

test('seven different posts across a week, each within 280 characters and free of long dashes', () => {
  const week = Array.from({ length: 7 }, (_, i) => dailyProductPost(d, 20_000 + i));
  assert.equal(new Set(week).size, 7);
  for (const p of week) {
    assert.ok(xLength(p) <= 280, `${xLength(p)}: ${p}`);
    assert.doesNotMatch(p, /[\u2014\u2013]/);
  }
});

test('posts carry the live numbers they are given', () => {
  const all = Array.from({ length: 7 }, (_, i) => dailyProductPost(d, i)).join('\n');
  assert.match(all, /219 AI agents rated/);
  assert.match(all, /35 of them are pre-approved/);
  assert.match(all, /SelfMade by SP3ND @SP3NDdotshop\n\nAAA, 960 out of 1000, about \$87,988 a month/);
  assert.match(all, /1 on-chain buyback so far/);
});

test('no price predictions or hype words', () => {
  const all = Array.from({ length: 7 }, (_, i) => dailyProductPost(d, i)).join('\n').toLowerCase();
  for (const w of ['100x', 'moon', 'guaranteed', 'pump', 'next 1000x', 'financial advice']) assert.ok(!new RegExp(`(^|[^a-z])${w}([^a-z]|$)`).test(all), w);
});
