import { actionJson, actionOptions, icon, MAINNET } from '@/lib/actions';
import { scoreForMint } from '@/lib/account';
import { config } from '@/lib/config';
import { verdict } from '@/lib/verdict';
import { settle } from '@/lib/x402-seller';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Called by the Blink client after the payment confirms: verify it on-chain, then show the verdict. */
export async function POST(req: Request, { params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  const quoteId = new URL(req.url).searchParams.get('q') ?? '';
  const body = (await req.json().catch(() => ({}))) as { account?: string; signature?: string };
  const fail = (message: string) => actionJson({
    type: 'action', icon: icon(), title: 'Report not unlocked', description: message, label: 'Try again', disabled: true, error: { message },
  });
  if (!quoteId || !body.account || !body.signature) return fail('Missing payment details.');

  const header = Buffer.from(JSON.stringify({ quote_id: quoteId, network: MAINNET, asset: 'SOL', payer_wallet: body.account, signature: body.signature })).toString('base64');
  let s = await settle(header, `report:${mint}`);
  for (let i = 0; i < 6 && !s.ok && /not found|failed/i.test(s.reason); i++) {
    await sleep(2500);
    s = await settle(header, `report:${mint}`);
  }
  if (!s.ok) return fail(s.reason);

  const r = await scoreForMint(mint);
  if (!r) return fail('That mint is no longer rated.');
  const v = verdict(r.score);
  return actionJson({
    type: 'completed',
    icon: icon(),
    title: `${r.project.projectName}: ${r.score.grade} · ${r.score.score}/1000 · ${v.verdict}`,
    description: `${v.reason}. Pre-approved line $${r.score.lineUsd.toFixed(2)}, creator revenue $${Math.round(r.score.monthlyCreatorUsd).toLocaleString('en-US')} a month. Receipt: https://solscan.io/tx/${s.signature} · Full report: ${config.baseUrl}/agent/${mint}`,
    label: 'Report unlocked',
  });
}

export const OPTIONS = actionOptions;
