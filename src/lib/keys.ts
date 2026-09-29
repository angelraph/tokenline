import { createHash, randomBytes } from 'node:crypto';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

/** API keys are shown once; only the SHA-256 is stored. */
export function newApiKey() {
  const key = `tl_${randomBytes(24).toString('base64url')}`;
  return { key, hash: hashKey(key), prefix: key.slice(0, 9) };
}

export const hashKey = (key: string) => createHash('sha256').update(key).digest('hex');

export function bearer(req: Request): string | null {
  const h = req.headers.get('authorization') ?? '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || req.headers.get('x-api-key') || null;
}

/** The message an applicant signs with their wallet to prove they control it. */
export function applyMessage(wallet: string, issuedAt: string) {
  return `Tokenline credit application\nwallet: ${wallet}\nissued: ${issuedAt}`;
}

export function verifyWalletSignature(wallet: string, message: string, signatureB58: string): boolean {
  try {
    const pub = bs58.decode(wallet);
    const sig = bs58.decode(signatureB58);
    if (pub.length !== 32 || sig.length !== 64) return false;
    return nacl.sign.detached.verify(new TextEncoder().encode(message), sig, pub);
  } catch {
    return false;
  }
}

export const isSolanaAddress = (s: string) => {
  try { return bs58.decode(s).length === 32; } catch { return false; }
};
