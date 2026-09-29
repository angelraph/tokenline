import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify } from '../src/lib/classify.ts';

const POOL = 'POOL1111111111111111111111111111111111111111';
const TLINE = 'TLINE111111111111111111111111111111111111111';
const ANSEM = 'ANSEM111111111111111111111111111111111111111';
const USDC = 'USDC1111111111111111111111111111111111111111';
const AGENT = 'AGENT11111111111111111111111111111111111111';
// The live pool doubles as the collateral escrow when no separate escrow wallet is set.
const w = { pool: POOL, escrow: POOL, usdc: USDC, collateralMints: [ANSEM, TLINE] };
const byWallet = new Map([[AGENT, { id: 'a1' }]]);

test('a swap the pool signs that brings $TOKENL in is a buyback', () => {
  const out = classify({
    signature: 's1', timestamp: 1, feePayer: POOL, type: 'SWAP',
    nativeTransfers: [{ fromUserAccount: 'WSOLTEMP', toUserAccount: POOL, amount: 2_039_280 }],
    tokenTransfers: [{ fromUserAccount: 'AMMVAULT', toUserAccount: POOL, tokenAmount: 1234, mint: TLINE }],
  }, byWallet, w);
  assert.deepEqual(out.map((o) => [o.type, o.amount, o.agentId]), [['buyback', 1234, null]]);
});

test('lamports moving inside a pool-signed swap are not counted as deposits', () => {
  const out = classify({
    signature: 's2', timestamp: 1, feePayer: POOL,
    nativeTransfers: [{ fromUserAccount: 'WSOLTEMP', toUserAccount: POOL, amount: 5_000_000 }],
  }, byWallet, w);
  assert.equal(out.length, 0);
});

test('collateral returned by the pool to an agent is a release, not a buyback', () => {
  const out = classify({
    signature: 's3', timestamp: 1, feePayer: POOL,
    tokenTransfers: [{ fromUserAccount: POOL, toUserAccount: AGENT, tokenAmount: 7, mint: ANSEM }],
  }, byWallet, w);
  assert.deepEqual(out.map((o) => [o.type, o.agentId]), [['collateral_release', 'a1']]);
});

test('an agent sending SOL to the pool is still a repayment', () => {
  const out = classify({
    signature: 's4', timestamp: 1, feePayer: AGENT,
    nativeTransfers: [{ fromUserAccount: AGENT, toUserAccount: POOL, amount: 1_000_000 }],
  }, byWallet, w);
  assert.deepEqual(out.map((o) => [o.type, o.agentId, o.amount]), [['repay', 'a1', 0.001]]);
});

test('an agent locking $ANSEM is collateral; a stranger sending SOL is a deposit', () => {
  const out = classify({
    signature: 's5', timestamp: 1, feePayer: AGENT,
    nativeTransfers: [{ fromUserAccount: 'BACKER', toUserAccount: POOL, amount: 2_000_000_000 }],
    tokenTransfers: [{ fromUserAccount: AGENT, toUserAccount: POOL, tokenAmount: 7, mint: ANSEM }],
  }, byWallet, w);
  assert.deepEqual(out.map((o) => o.type), ['deposit', 'collateral']);
});
