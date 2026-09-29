import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { accountOf, actionError, actionJson, actionOptions, icon, serialize } from '@/lib/actions';
import { scoreForMint } from '@/lib/account';
import { config } from '@/lib/config';
import { makeQuote, quoteMemo } from '@/lib/x402-seller';

export const dynamic = 'force-dynamic';

const MEMO_PROGRAM = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

export async function GET(_req: Request, { params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  const r = await scoreForMint(mint).catch(() => null);
  if (!r) return actionError('That mint is not a tokenized Clawrena agent', 404);
  return actionJson({
    type: 'action',
    icon: icon(),
    title: `${r.project.projectName} ($${r.project.symbol}) on Tokenline`,
    description: `Rated ${r.score.grade} (${r.score.score}/1000) from on-chain creator fees. Buy the verified credit report with a counterparty verdict for $${config.reportPriceUsd} in SOL. Paid to the Tokenline pool, checked on-chain.`,
    label: `Buy report · $${config.reportPriceUsd}`,
    links: {
      actions: [{ type: 'transaction', label: `Buy verified report · $${config.reportPriceUsd}`, href: `/api/actions/report/${mint}` }],
    },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  if (!config.poolWallet || !config.quoteSecret) return actionError('Report sales are not configured', 503);
  if (!(await scoreForMint(mint).catch(() => null))) return actionError('That mint is not a tokenized Clawrena agent', 404);
  const account = await accountOf(req);
  if (!account) return actionError('Connect a wallet first');

  const { quote } = await makeQuote(`report:${mint}`);
  const sol = quote.accepts[0];
  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: account, toPubkey: new PublicKey(sol.pay_to), lamports: sol.amount_microunits }),
    new TransactionInstruction({ keys: [], programId: MEMO_PROGRAM, data: Buffer.from(quoteMemo(quote.quote_id), 'utf8') }),
  );
  return actionJson({
    type: 'transaction',
    transaction: await serialize(tx, account),
    message: `Paying $${config.reportPriceUsd} in SOL for the verified report.`,
    links: { next: { type: 'post', href: `/api/actions/report/${mint}/next?q=${encodeURIComponent(quote.quote_id)}` } },
  });
}

export const OPTIONS = actionOptions;
