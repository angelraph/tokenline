import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyAutoBuyback } from '../src/lib/classify.ts';
import { buybackReceipt } from '../src/lib/dailypost.ts';

const W = 'Pt2XMXdFesf3Wb5VafNVikvSQDGtsN1kdhRgWJ7MUF6';
const TL = '4sfvc4dHviSKG33KnT6ZvecXtUpvqtE4Nb4Stkj2S9Ya';
const WSOL = 'So11111111111111111111111111111111111111112';
const since = Date.parse('2026-10-21T07:00:00Z');
const at = (iso: string) => Date.parse(iso) / 1000;

test('a swap that pays SOL and brings $TOKENL in is a ClawPump buyback', () => {
  const out = classifyAutoBuyback({
    signature: 's', timestamp: at('2026-10-22T10:00:00Z'),
    nativeTransfers: [{ fromUserAccount: W, toUserAccount: 'AMM', amount: 20_000_000 }],
    tokenTransfers: [{ fromUserAccount: 'AMM', toUserAccount: W, tokenAmount: 6800, mint: TL }],
  }, W, TL, since);
  assert.deepEqual(out.map((o) => [o.type, o.amount, o.from]), [['buyback', 6800, 'clawpump']]);
});

test('paying in wrapped SOL counts too', () => {
  const out = classifyAutoBuyback({
    signature: 's', timestamp: at('2026-10-22T10:00:00Z'),
    tokenTransfers: [
      { fromUserAccount: W, toUserAccount: 'AMM', tokenAmount: 0.02, mint: WSOL },
      { fromUserAccount: 'AMM', toUserAccount: W, tokenAmount: 6800, mint: TL },
    ],
  }, W, TL, since);
  assert.equal(out[0]?.type, 'buyback');
});

test('a plain transfer in (no SOL paid) is not a buyback', () => {
  const out = classifyAutoBuyback({
    signature: 's', timestamp: at('2026-10-22T10:00:00Z'),
    tokenTransfers: [{ fromUserAccount: 'SOMEONE', toUserAccount: W, tokenAmount: 5000, mint: TL }],
  }, W, TL, since);
  assert.deepEqual(out, []);
});

test('activity before auto-buyback was switched on is ignored, like the launch purchase', () => {
  const out = classifyAutoBuyback({
    signature: 's', timestamp: at('2026-09-29T13:05:00Z'),
    nativeTransfers: [{ fromUserAccount: W, toUserAccount: 'CURVE', amount: 50_000_000 }],
    tokenTransfers: [{ fromUserAccount: 'CURVE', toUserAccount: W, tokenAmount: 9_000_000, mint: TL }],
  }, W, TL, since);
  assert.deepEqual(out, []);
});

test('$TOKENL leaving the wallet to nowhere is a burn', () => {
  const out = classifyAutoBuyback({
    signature: 's', timestamp: at('2026-10-22T10:05:00Z'),
    tokenTransfers: [{ fromUserAccount: W, toUserAccount: '', tokenAmount: 6800, mint: TL }],
  }, W, TL, since);
  assert.deepEqual(out.map((o) => [o.type, o.amount]), [['burn', 6800]]);
});

test('the receipt says it was automatic and burned when it was', () => {
  const t = buybackReceipt({ amount: 6800, usd: 2.5, signature: 'X'.repeat(88), isTokenl: true, source: 'clawpump', burned: true }, 25);
  assert.match(t, /^Buyback done: 6,800 \$TOKENL \(\$2\.50\) bought and burned, automatically from creator fees\./);
  assert.match(t, /25% of creator fees/);
});
