import { z } from 'zod';
import { createHash } from 'node:crypto';
import { findProject } from '@/lib/clawrena';
import { newApiKey, verifyWalletSignature, isSolanaAddress } from '@/lib/keys';
import { store } from '@/lib/store';
import { ok, fail } from '@/lib/http';

export const dynamic = 'force-dynamic';

const Body = z.object({
  wallet: z.string().refine(isSolanaAddress, 'not a Solana address'),
  message: z.string().max(500),
  signature: z.string().min(40).max(120),
  name: z.string().trim().min(1).max(60),
  mint: z.string().refine(isSolanaAddress, 'not a mint address').optional().or(z.literal('')),
});

const verifyCodeFn = (agentId: string) =>
  'TLINE-' + createHash('sha256').update(agentId).digest('hex').slice(0, 6).toUpperCase();

/**
 * Open a Tokenline account. The wallet signs a fresh message, which proves control
 * and binds repayments/collateral from that wallet to the agent. Re-applying with
 * the same wallet rotates the API key.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(422, 'invalid application', { issues: parsed.error.issues });
  const { wallet, message, signature, name } = parsed.data;
  const mint = parsed.data.mint || null;

  const issued = message.match(/issued: (.+)$/m)?.[1];
  if (!message.includes(`wallet: ${wallet}`) || !issued || Math.abs(Date.now() - Date.parse(issued)) > 10 * 60_000) {
    return fail(400, 'message must be the one from /api/apply/message, signed within 10 minutes');
  }
  if (!verifyWalletSignature(wallet, message, signature)) return fail(401, 'signature does not match wallet');

  let xHandle: string | null = null;
  if (mint) {
    const { project } = await findProject(mint);
    if (!project) return fail(404, 'mint is not a tokenized Clawrena entry; leave it blank for a collateral-only line');
    xHandle = project.xHandle;
  }

  const { key, hash, prefix } = newApiKey();
  const existing = await store.getAgentByWallet(wallet);
  let agentId: string;
  if (existing) {
    const mintChanged = existing.mint !== mint;
    await store.updateAgent(existing.id, { name, mint, xHandle, keyHash: hash, keyPrefix: prefix,
      verified: mintChanged ? false : existing.verified });
    agentId = existing.id;
  } else {
    const a = await store.createAgent({ name, wallet, mint, xHandle, keyHash: hash, keyPrefix: prefix, verified: false, frozen: false });
    agentId = a.id;
    await store.addEvent({ agentId, type: 'apply', amountUsd: 0, asset: null, amount: null, txSig: null, meta: { mint, name } });
  }

  const code = verifyCodeFn(agentId);
  return ok({
    agentId,
    apiKey: key,
    note: 'Store this key now; it is never shown again.',
    verification: mint
      ? { code, instructions: `Post "Tokenline verify ${code}" from @${xHandle ?? 'your project X account'} to unlock your unsecured line.` }
      : null,
  });
}
