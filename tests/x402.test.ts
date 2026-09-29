import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuote } from '../src/lib/x402.ts';

const quote = {
  x402_version: 2,
  quote_id: '6982dfc8-a8f0-4429-8326-3e31251dec7c',
  accepts: [
    { asset: 'USDC', scheme: 'exact', network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', pay_to: 'GXfqVnZENHzvim8rNN8TPwqxWXQe8EBbxhcEMYE8Z7BS', amount_microunits: 10000 },
    { asset: 'SOL', scheme: 'exact', network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', pay_to: 'GXfqVnZENHzvim8rNN8TPwqxWXQe8EBbxhcEMYE8Z7BS', amount_microunits: 84000 },
  ],
};
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64');

test('parses a UsePod PAYMENT-REQUIRED header', () => {
  const q = parseQuote(b64(quote));
  assert.equal(q?.quote_id, quote.quote_id);
  assert.equal(q?.accepts.find((a) => a.asset === 'SOL')?.amount_microunits, 84000);
});

test('rejects missing or malformed headers', () => {
  assert.equal(parseQuote(null), null);
  assert.equal(parseQuote('not base64 json'), null);
  assert.equal(parseQuote(b64({ accepts: [] })), null);
});
