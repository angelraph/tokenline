import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyProductPost, MAX_POST, xLength, type PostData } from '../src/lib/dailypost.ts';

const DASHES = new RegExp(`[${String.fromCharCode(0x2014)}${String.fromCharCode(0x2013)}]`);

const d: PostData = {
  base: 'https://tokenline.online', agents: 219, approved: 35, trading: 37,
  top: { project: 'SelfMade by SP3ND', xHandle: 'SP3NDdotshop', grade: 'AAA', score: 960, monthlyCreatorUsd: 87988.4, mint: 'E'.repeat(44) },
  draws: 3, buybacks: 2, tokenMint: '4sfvc4dHviSKG33KnT6ZvecXtUpvqtE4Nb4Stkj2S9Ya',
  top3: [{ project: 'SelfMade by SP3ND', grade: 'AAA', score: 963 }, { project: 'Shinjuku StAItion', grade: 'AAA', score: 948 }, { project: 'Hot Bot', grade: 'AAA', score: 929 }],
};

test('seven different long-form posts across a week, each within the long-post limit and free of long dashes', () => {
  const week = Array.from({ length: 7 }, (_, i) => dailyProductPost(d, 20_000 + i));
  assert.equal(new Set(week).size, 7);
  for (const p of week) {
    assert.ok(xLength(p) <= MAX_POST, `${xLength(p)}: ${p}`);
    assert.ok(xLength(p) > 280, `too short for a long-form post: ${p}`);
    assert.doesNotMatch(p, DASHES);
  }
});

test('posts carry the live numbers they are given', () => {
  const all = Array.from({ length: 7 }, (_, i) => dailyProductPost(d, i)).join('\n');
  assert.match(all, /that's 219 agents rated, and 35 of them have a credit line waiting/);
  assert.match(all, /SelfMade by SP3ND @SP3NDdotshop sits at #1 on the Tokenline Credit Board: AAA, 960 out of 1000, earning about \$87,988 a month/);
  assert.match(all, /1\. SelfMade by SP3ND, AAA 963\n2\. Shinjuku StAItion, AAA 948\n3\. Hot Bot, AAA 929/);
  assert.match(all, /2 times so far/);
});

test('every post links to something people can check', () => {
  for (let i = 0; i < 7; i++) {
    const p = dailyProductPost(d, i);
    assert.match(p, /https:\/\/tokenline\.online|t\.me\/tokenlinehq/, p);
  }
});

test('no price predictions or hype words', () => {
  const all = Array.from({ length: 7 }, (_, i) => dailyProductPost(d, i)).join('\n').toLowerCase();
  for (const w of ['100x', 'moon', 'guaranteed', 'pump', 'next 1000x', 'financial advice']) assert.ok(!new RegExp(`(^|[^a-z])${w}([^a-z]|$)`).test(all), w);
});
