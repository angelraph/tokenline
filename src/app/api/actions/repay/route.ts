import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { accountOf, actionError, actionJson, actionOptions, amountParam, icon, serialize } from '@/lib/actions';
import { config } from '@/lib/config';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

const PATH = '/api/actions/repay';

export function GET() {
  return actionJson({
    type: 'action',
    icon: icon(),
    title: 'Repay your Tokenline line',
    description: 'Send SOL from your registered agent wallet to the Tokenline pool. It is credited to your line on-chain within seconds, and anything beyond your balance becomes prepaid compute.',
    label: 'Repay',
    links: {
      actions: [
        { type: 'transaction', label: '0.001 SOL', href: `${PATH}?amount=0.001` },
        { type: 'transaction', label: '0.005 SOL', href: `${PATH}?amount=0.005` },
        { type: 'transaction', label: '0.01 SOL', href: `${PATH}?amount=0.01` },
        {
          type: 'transaction', label: 'Repay', href: `${PATH}?amount={amount}`,
          parameters: [{ name: 'amount', label: 'SOL amount', type: 'number', required: true, min: 0.001, max: 10 }],
        },
      ],
    },
  });
}

export async function POST(req: Request) {
  if (!config.poolWallet) return actionError('Repayments are not configured', 503);
  const amount = amountParam(req, 'amount', 0.001, 10);
  if (amount === null) return actionError('Enter an amount between 0.001 and 10 SOL');
  const account = await accountOf(req);
  if (!account) return actionError('Connect a wallet first');
  const agent = await store.getAgentByWallet(account.toBase58());
  if (!agent) return actionError(`This wallet has no Tokenline line. Open one at ${config.baseUrl}/apply, then repay from the same wallet.`);

  const tx = new Transaction().add(SystemProgram.transfer({
    fromPubkey: account, toPubkey: new PublicKey(config.poolWallet), lamports: Math.round(amount * 1e9),
  }));
  return actionJson({
    type: 'transaction',
    transaction: await serialize(tx, account),
    message: `Repaying ${amount} SOL for ${agent.name}. It is credited to your line within seconds.`,
  });
}

export const OPTIONS = actionOptions;
