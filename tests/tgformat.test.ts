import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyMessage, esc, findAgent, helpMessage, scoreMessage, topMessage, watchMessage, type TgRow } from '../src/lib/tgformat.ts';

const base = 'https://tokenline.vercel.app';
const row = (o: Partial<TgRow>): TgRow => ({
  rank: 1, mint: 'M'.repeat(44), project: 'Agent', symbol: 'AGT', xHandle: null,
  score: 900, grade: 'AAA', lineUsd: 0.45, monthlyCreatorUsd: 12345, volume24hUsd: 5000, stale: false, ...o,
});
const rows = [
  row({ rank: 1, mint: 'A'.repeat(44), project: 'SelfMade by SP3ND', symbol: 'MADE' }),
  row({ rank: 2, mint: 'B'.repeat(44), project: 'Shinjuku StAItion', symbol: 'SHINJUKU' }),
  row({ rank: 3, mint: 'C'.repeat(44), project: 'Made Dao', symbol: 'MDAO', lineUsd: 0, stale: true }),
];

test('finds an agent by mint, ticker, name prefix or name fragment', () => {
  assert.equal(findAgent(rows, 'B'.repeat(44))?.rank, 2);
  assert.equal(findAgent(rows, '$made')?.rank, 1);
  assert.equal(findAgent(rows, 'shinjuku')?.rank, 2);
  assert.equal(findAgent(rows, 'sp3nd')?.rank, 1);
  assert.equal(findAgent(rows, 'nobody here'), undefined);
  assert.equal(findAgent(rows, '   '), undefined);
});

test('escapes HTML so project names cannot break the message', () => {
  assert.equal(esc('<b>A & B</b>'), '&lt;b&gt;A &amp; B&lt;/b&gt;');
  assert.match(scoreMessage(row({ project: 'X <script>' }), [], 3, base), /X &lt;script&gt;/);
});

test('a score message shows grade, rank, line, factor bars and the report link', () => {
  const m = scoreMessage(rows[0], [{ label: 'Fee recency', points: 175, max: 175 }, { label: 'Holder distribution', points: 50, max: 100 }], 196, base);
  assert.match(m, /Grade <b>AAA<\/b> · <b>900<\/b>\/1000 · #1 of 196/);
  assert.match(m, /Pre-approved line: <b>\$0\.45<\/b>/);
  assert.match(m, /<code>▰{10}<\/code> Fee recency 175\/175/);
  assert.match(m, /<code>▰{5}▱{5}<\/code> Holder distribution 50\/100/);
  assert.ok(m.endsWith(`${base}/agent/${'A'.repeat(44)}`));
  assert.match(scoreMessage(rows[2], [], 3, base), /Line paused/);
});

test('the daily channel post is never empty', () => {
  assert.match(dailyMessage([], rows, base), /Daily Credit Board/);
  assert.match(dailyMessage([], rows, base), /3 Clawrena agents rated from on-chain fees, 2 pre-approved/);
  assert.equal(dailyMessage(['Post one', 'Reply <two>'], rows, base), 'Post one\n\nReply &lt;two&gt;');
});

test('messages stay well inside Telegram limits and contain no long dashes', () => {
  const moves = Array.from({ length: 20 }, (_, i) => ({ mint: 'A'.repeat(44), project: 'P', from: 700, to: 700 + i, delta: i, gradeTo: 'AA', lineTo: 0.4, kind: 'upgrade' }));
  for (const m of [helpMessage(base), topMessage(rows, base), watchMessage(moves, rows, base), watchMessage([], rows, base), dailyMessage([], rows, base)]) {
    assert.ok(m.length < 4096);
    assert.doesNotMatch(m, /[\u2014\u2013]/);
  }
  assert.match(watchMessage(moves, rows, base), /and 14 more/);
});
