import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readHistory } from '../src/lib/paging.ts';

// A wallet history, newest first: tx299 ... tx0, one per second from timestamp 1000.
const history = Array.from({ length: 300 }, (_, i) => ({ signature: `tx${299 - i}`, timestamp: 1000 + 299 - i }));
const server = (pageSize = 100) => {
  const calls: (string | undefined)[] = [];
  const fetchPage = async (before?: string) => {
    calls.push(before);
    const start = before ? history.findIndex((t) => t.signature === before) + 1 : 0;
    return history.slice(start, start + pageSize);
  };
  return { fetchPage, calls };
};

test('reads every page back to the bookmark, not just the newest 100', async () => {
  const { fetchPage, calls } = server();
  const { txs, complete } = await readHistory(fetchPage, { until: 'tx50' });
  assert.equal(txs.length, 249);
  assert.equal(txs[0].signature, 'tx299');
  assert.equal(txs[txs.length - 1].signature, 'tx51');
  assert.equal(complete, true);
  assert.deepEqual(calls, [undefined, 'tx200', 'tx100']);
});

test('stops at the bookmark on the first page without extra requests', async () => {
  const { fetchPage, calls } = server();
  const { txs } = await readHistory(fetchPage, { until: 'tx295' });
  assert.deepEqual(txs.map((t) => t.signature), ['tx299', 'tx298', 'tx297', 'tx296']);
  assert.equal(calls.length, 1);
});

test('a backfill with no bookmark stops at the start date', async () => {
  const { fetchPage } = server();
  const { txs, complete } = await readHistory(fetchPage, { sinceMs: 1_150_000 });
  assert.equal(txs[txs.length - 1].timestamp, 1150);
  assert.equal(complete, true);
});

test('reaching the end of the history is complete', async () => {
  const { fetchPage } = server();
  const { txs, complete } = await readHistory(fetchPage);
  assert.equal(txs.length, 300);
  assert.equal(complete, true);
});

test('hitting the page limit is reported, so the bookmark is not moved past unread history', async () => {
  const { fetchPage } = server();
  const { txs, complete } = await readHistory(fetchPage, { maxPages: 2 });
  assert.equal(txs.length, 200);
  assert.equal(complete, false);
});
