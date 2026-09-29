import { PublicKey, Transaction } from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction, getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { accountOf, actionError, actionJson, actionOptions, amountParam, icon, rpc, serialize } from '@/lib/actions';
import { config } from '@/lib/config';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

const PATH = '/api/actions/collateral';
const DECIMALS = 6;

export function GET() {
  return actionJson({
    type: 'action',
    icon: icon(),
    title: 'Lock $ANSEM on Tokenline',
    description: `Lock $ANSEM as collateral and your compute credit line grows by ${Math.round(config.policy.collateralLtv * 100)}% of its value, instantly. Send from your registered agent wallet.`,
    label: 'Lock $ANSEM',
    links: {
      actions: [
        { type: 'transaction', label: '5 ANSEM', href: `${PATH}?amount=5` },
        { type: 'transaction', label: '25 ANSEM', href: `${PATH}?amount=25` },
        { type: 'transaction', label: '100 ANSEM', href: `${PATH}?amount=100` },
        {
          type: 'transaction', label: 'Lock', href: `${PATH}?amount={amount}`,
          parameters: [{ name: 'amount', label: '$ANSEM amount', type: 'number', required: true, min: 1, max: 1000000 }],
        },
      ],
    },
  });
}

export async function POST(req: Request) {
  if (!config.escrowWallet) return actionError('Collateral is not configured', 503);
  const amount = amountParam(req, 'amount', 1, 1_000_000);
  if (amount === null) return actionError('Enter an amount of at least 1 ANSEM');
  const account = await accountOf(req);
  if (!account) return actionError('Connect a wallet first');
  const agent = await store.getAgentByWallet(account.toBase58());
  if (!agent) return actionError(`This wallet has no Tokenline line. Open one at ${config.baseUrl}/apply, then lock $ANSEM from the same wallet.`);

  const mint = new PublicKey(config.mints.ansem);
  const escrow = new PublicKey(config.escrowWallet);
  const from = getAssociatedTokenAddressSync(mint, account, false, TOKEN_2022_PROGRAM_ID);
  const to = getAssociatedTokenAddressSync(mint, escrow, true, TOKEN_2022_PROGRAM_ID);
  const units = BigInt(Math.round(amount * 10 ** DECIMALS));

  const bal = await rpc().getTokenAccountBalance(from).catch(() => null);
  if (!bal || BigInt(bal.value.amount) < units) return actionError(`This wallet holds ${bal?.value.uiAmountString ?? '0'} ANSEM, not enough to lock ${amount}.`);

  const tx = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(account, to, escrow, mint, TOKEN_2022_PROGRAM_ID),
    createTransferCheckedInstruction(from, mint, to, account, units, DECIMALS, [], TOKEN_2022_PROGRAM_ID),
  );
  return actionJson({
    type: 'transaction',
    transaction: await serialize(tx, account),
    message: `Locking ${amount} $ANSEM for ${agent.name}. Your line rises as soon as it lands.`,
  });
}

export const OPTIONS = actionOptions;
