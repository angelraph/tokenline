import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signature, pct } from '../src/lib/oauth1.ts';
import { composeDigest, windowLabel, xLength, type BotMove } from '../src/lib/watchbot.ts';

test('OAuth 1.0a signature matches the X developer docs example', () => {
  // "Creating a signature", developer.x.com: POST statuses/update with the documented keys.
  const sig = signature('POST', 'https://api.twitter.com/1.1/statuses/update.json', {
    status: 'Hello Ladies + Gentlemen, a signed OAuth request!',
    include_entities: 'true',
    oauth_consumer_key: 'xvz1evFS4wEEPTGEFPHBog',
    oauth_nonce: 'kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg',
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: '1318622958',
    oauth_token: '370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb',
    oauth_version: '1.0',
  }, 'kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw', 'LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE');
  assert.equal(sig, 'hCtSmYh+iHYCEqBWrE7C7hYmtUk=');
});

test('percent-encoding follows RFC 3986', () => {
  assert.equal(pct("Ladies + Gentlemen!*'()"), 'Ladies%20%2B%20Gentlemen%21%2A%27%28%29');
});

const base = 'https://tokenline.vercel.app';
const now = Date.parse('2026-09-30T15:00:00Z');
const since = now - 24 * 3_600_000;
const move = (m: Partial<BotMove>): BotMove => ({
  mint: 'M'.repeat(44), project: 'Agent', xHandle: 'agent', from: 700, to: 700, delta: 0,
  gradeTo: 'AA', lineFrom: 0.3, lineTo: 0.3, kind: 'upgrade', ...m,
});

test('nothing moved means nothing is posted', () => {
  assert.deepEqual(composeDigest([], since, now, base), []);
});

test('header counts every move; replies tag only upgrades and new lines, best first', () => {
  const posts = composeDigest([
    move({ xHandle: 'small', delta: 30, to: 730 }),
    move({ xHandle: 'big', delta: 80, to: 880, gradeTo: 'AAA' }),
    move({ xHandle: 'fell', delta: -60, to: 500, kind: 'downgrade' }),
    move({ xHandle: 'fresh', delta: 40, to: 640, gradeTo: 'A', lineFrom: 0, lineTo: 0.32, kind: 'newly_approved' }),
  ], since, now, base);
  assert.match(posts[0], /Two agents moved up, one got its first credit line and one slipped\./);
  assert.match(posts[0], /Biggest jump: @big, now AAA at 880, up 80 points\./);
  assert.equal(posts.length, 4);
  assert.ok(posts.every((p) => !p.includes('@fell')));
  assert.match(posts[1], /@big.*880/);
  assert.match(posts[2], /@fresh.*\$0\.32/);
  assert.match(posts[3], /@small.*730/);
  assert.ok(posts[1].endsWith(`${base}/agent/${'M'.repeat(44)}`));
});

test('reads like a person: no symbols, and wording changes from day to day', () => {
  const moves = [move({ xHandle: 'big', delta: 80, to: 880, gradeTo: 'AAA' })];
  const days = [0, 1, 2, 3].map((d) => composeDigest(moves, since + d * 86_400_000, now + d * 86_400_000, base));
  for (const posts of days) for (const p of posts) assert.doesNotMatch(p, /[25b225bc271320142013]/);
  assert.ok(new Set(days.map((p) => p[0].split('\n')[0])).size > 1);
  assert.ok(new Set(days.map((p) => p[1].split('\n')[0])).size > 1);
});

test('replies are capped and every post fits in 280 characters', () => {
  const many = Array.from({ length: 9 }, (_, i) => move({ xHandle: `team_with_a_long_handle${i}`, project: 'A very long project name indeed', delta: 25 + i, to: 900 }));
  const posts = composeDigest(many, since, now, base, 4);
  assert.equal(posts.length, 5);
  for (const p of posts) assert.ok(xLength(p) <= 280, `${xLength(p)}: ${p}`);
});

test('stays quiet with under 12 hours of history or only bad news', () => {
  assert.deepEqual(composeDigest([move({ delta: 50 })], now - 3 * 3_600_000, now, base), []);
  assert.deepEqual(composeDigest([move({ kind: 'downgrade', delta: -40 })], since, now, base), []);
  assert.equal(composeDigest([move({ delta: 50 })], now - 13 * 3_600_000, now, base).length, 2);
});

test('a short history window is labelled honestly', () => {
  assert.equal(windowLabel(now - 9 * 3_600_000, now), '9h');
  assert.equal(windowLabel(now - 23 * 3_600_000, now), '24h');
});
