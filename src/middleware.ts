import { NextResponse, type NextRequest } from 'next/server';

// Visitors on the old tokenline.vercel.app address are sent to the main domain set in PUBLIC_BASE_URL.
// Only pages move: anything an agent, wallet or service calls keeps answering on both addresses.

// The old Vercel address and the www form both forward to the main domain.
const OLD_HOSTS = ['tokenline.vercel.app', 'www.tokenline.online'];

export function middleware(req: NextRequest) {
  const main = process.env.PUBLIC_BASE_URL;
  const host = req.headers.get('host') ?? '';
  if (!main || !OLD_HOSTS.includes(host)) return NextResponse.next();
  let target: URL;
  try { target = new URL(main); } catch { return NextResponse.next(); }
  if (target.host === host) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.protocol = target.protocol;
  url.host = target.host;
  url.port = '';
  return NextResponse.redirect(url, 308);
}

export const config = {
  // Pages only. API routes, the OpenAI/Anthropic endpoints, MCP, Blinks, share images and static files stay put.
  matcher: ['/((?!api/|v1/|mcp|actions.json|_next/|.*opengraph-image|favicon|.*\\.).*)'],
};
