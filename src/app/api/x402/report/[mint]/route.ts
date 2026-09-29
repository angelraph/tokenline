import { scoreForMint } from '@/lib/account';
import { config } from '@/lib/config';
import { creditMemo } from '@/lib/memo';
import { store } from '@/lib/store';
import { verdict } from '@/lib/verdict';
import { makeQuote, settle } from '@/lib/x402-seller';

export const dynamic = 'force-dynamic';

const cors = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'PAYMENT-REQUIRED, PAYMENT-RESPONSE' };

/**
 * Paid, machine-readable credit report. Speaks x402: call without payment to get
 * a quote in the PAYMENT-REQUIRED header, pay the pool in SOL, retry with
 * PAYMENT-SIGNATURE. Revenue lands in the lending pool.
 */
export async function GET(req: Request, { params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  if (!config.poolWallet || !config.quoteSecret) {
    return Response.json({ error: 'report sales are not configured' }, { status: 503, headers: cors });
  }
  const resource = `report:${mint}`;
  const r = await scoreForMint(mint);
  if (!r) return Response.json({ error: 'mint is not a tokenized Clawrena entry' }, { status: 404, headers: cors });

  const payment = req.headers.get('payment-signature') ?? req.headers.get('x-payment');
  if (!payment) {
    const { quote, header } = await makeQuote(resource);
    return Response.json(
      { error: 'payment_required', price_usd: config.reportPriceUsd, quote },
      { status: 402, headers: { ...cors, 'PAYMENT-REQUIRED': header } },
    );
  }

  const s = await settle(payment, resource);
  if (!s.ok) return Response.json({ error: 'payment_rejected', reason: s.reason }, { status: 402, headers: cors });

  const agent = (await store.listAgents()).find((a) => a.mint === mint);
  const memo = await creditMemo(r.project, r.score);
  return Response.json({
    mint,
    project: r.project.projectName,
    symbol: r.project.symbol,
    xHandle: r.project.xHandle,
    score: r.score.score,
    grade: r.score.grade,
    ...verdict(r.score),
    preApprovedLineUsd: r.score.lineUsd,
    monthlyCreatorRevenueUsd: r.score.monthlyCreatorUsd,
    stale: r.score.stale,
    factors: r.score.components,
    memo: memo.text,
    tokenline: agent ? { onLine: true, verified: agent.verified, frozen: agent.frozen } : { onLine: false },
    receipt: { signature: s.signature, lamports: s.lamports, payer: s.payer },
    issuedAt: new Date().toISOString(),
  }, { headers: { ...cors, 'PAYMENT-RESPONSE': Buffer.from(JSON.stringify({ signature: s.signature })).toString('base64') } });
}
