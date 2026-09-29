import { ACTION_HEADERS } from '@/lib/actions';

/** Solana Actions discovery: maps shareable Tokenline URLs to their Blink endpoints. */
export function GET() {
  return new Response(JSON.stringify({
    rules: [
      { pathPattern: '/agent/*', apiPath: '/api/actions/report/*' },
      { pathPattern: '/repay', apiPath: '/api/actions/repay' },
      { pathPattern: '/lock', apiPath: '/api/actions/collateral' },
      { pathPattern: '/api/actions/**', apiPath: '/api/actions/**' },
    ],
  }), { headers: ACTION_HEADERS });
}

export const OPTIONS = GET;
