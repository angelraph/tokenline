import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alertText, diffAlerts, linkMessage, makeLinkCode, readLinkCode, stateOf, type AlertRow } from '../src/lib/alertscore.ts';

const base = 'https://tokenline.vercel.app';
const row = (o: Partial<AlertRow>): AlertRow => ({ mint: 'A'.repeat(44), project: 'Agent', grade: 'AA', score: 750, lineUsd: 0.3, volume24hUsd: 2_000, ...o });

test('the first run only records state and alerts nothing', () => {
  assert.deepEqual(diffAlerts(null, [row({})]), []);
});

test('detects upgrades, downgrades, new and paused lines, and volume spikes', () => {
  const prev = stateOf([
    row({ mint: 'U'.repeat(44), score: 700 }),
    row({ mint: 'D'.repeat(44), score: 800 }),
    row({ mint: 'N'.repeat(44), lineUsd: 0 }),
    row({ mint: 'P'.repeat(44), lineUsd: 0.4 }),
    row({ mint: 'S'.repeat(44), volume24hUsd: 3_000 }),
    row({ mint: 'Q'.repeat(44), score: 750 }),
  ]);
  const now = [
    row({ mint: 'U'.repeat(44), project: 'Up', score: 740, grade: 'AA' }),
    row({ mint: 'D'.repeat(44), project: 'Down', score: 760 }),
    row({ mint: 'N'.repeat(44), project: 'New', lineUsd: 0.35 }),
    row({ mint: 'P'.repeat(44), project: 'Paused', lineUsd: 0 }),
    row({ mint: 'S'.repeat(44), project: 'Spike', volume24hUsd: 12_000 }),
    row({ mint: 'Q'.repeat(44), project: 'Quiet', score: 760 }),
  ];
  const kinds = diffAlerts(prev, now).map((e) => `${e.kind}:${e.project}`).sort();
  assert.deepEqual(kinds, ['downgrade:Down', 'line_paused:Paused', 'new_line:New', 'upgrade:Up', 'volume_spike:Spike']);
});

test('small volume is never a spike, however large the multiple', () => {
  const prev = stateOf([row({ volume24hUsd: 10 })]);
  assert.deepEqual(diffAlerts(prev, [row({ volume24hUsd: 4_000 })]), []);
});

test('alert text leads with volume spikes, links every agent and escapes names', () => {
  const t = alertText([
    { kind: 'downgrade', mint: 'D'.repeat(44), project: 'Down', from: 800, to: 760, grade: 'AA' },
    { kind: 'volume_spike', mint: 'S'.repeat(44), project: 'Spike <x>', from: 3_000, to: 12_000 },
  ], base);
  assert.ok(t.indexOf('Volume spike') < t.indexOf('Downgrade'));
  assert.match(t, /Spike &lt;x&gt;<\/b> traded \$12,000 in 24h, up from \$3,000/);
  assert.match(t, new RegExp(`${base}/agent/${'S'.repeat(44)}`));
});

test('link codes round-trip, expire after 30 minutes and reject tampering', () => {
  const now = Date.parse('2026-10-21T12:00:00Z');
  const code = makeLinkCode(123456789, 'secret', now);
  assert.equal(readLinkCode(code, 'secret', now + 29 * 60_000), 123456789);
  assert.equal(readLinkCode(code, 'secret', now + 31 * 60_000), null);
  assert.equal(readLinkCode(code, 'other secret', now), null);
  const forged = Buffer.from(`999.${now + 60_000}`).toString('base64url') + '.' + code.split('.')[1];
  assert.equal(readLinkCode(forged, 'secret', now), null);
  assert.match(linkMessage(code), new RegExp(`code: ${code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
});
