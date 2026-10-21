import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buybackAnnouncement, buybackReceipt, xLength } from '../src/lib/dailypost.ts';

const sig = '516qkBJPs5GpJBG6NX9rRCJTh3tg9GVej6jVmy6oxmBLXkuSWSBpnwnBXxGW6wU6QkxmhYjCCxrtm3whEacbdAFy';

test('a receipt states the real amount, value and transaction', () => {
  const t = buybackReceipt({ amount: 34019.217625, usd: 0.116788, signature: sig, isTokenl: true }, null);
  assert.match(t, /^Buyback done: 34,019 \$TOKENL \(\$0\.12\) bought on the open market/);
  assert.ok(t.endsWith(`https://solscan.io/tx/${sig}`));
  assert.doesNotMatch(t, /creator fees/);
  assert.ok(xLength(t) <= 280);
});

test('the creator-fee promise only appears once the rule is set', () => {
  const t = buybackReceipt({ amount: 6800, usd: 2.5, signature: sig, isTokenl: true }, 25);
  assert.match(t, /part of the 25% of creator fees we put back into \$TOKENL, as promised/);
  assert.ok(xLength(t) <= 280);
  const a = buybackAnnouncement(25, 'https://tokenline.vercel.app');
  assert.match(a, /^New rule for \$TOKENL: 25% of Tokenline's creator fees buys \$TOKENL/);
  assert.ok(xLength(a) <= 280);
});

test('larger buybacks round to whole dollars', () => {
  assert.match(buybackReceipt({ amount: 1_000_000, usd: 1234.56, signature: sig, isTokenl: true }, null), /\(\$1,235\)/);
});
