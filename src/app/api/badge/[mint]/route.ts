import { scoreForMint } from '@/lib/account';

export const dynamic = 'force-dynamic';

const COLORS: Record<string, string> = {
  AAA: '#6fb31f', AA: '#6fb31f', A: '#1f8fd1', BBB: '#1f8fd1', BB: '#d18a1f', B: '#d18a1f', C: '#d1344a',
};
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Embeddable credit badge for READMEs, sites and X banners. */
export async function GET(_req: Request, { params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  const r = await scoreForMint(mint).catch(() => null);
  const label = 'Tokenline credit';
  const value = r ? `${r.score.grade} · ${r.score.score}` : 'unrated';
  const color = r ? COLORS[r.score.grade] : '#6b7280';
  const lw = 104, vw = Math.round(Math.max(64, value.length * 7.4 + 16)), w = lw + vw;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="22" role="img" aria-label="${esc(label)}: ${esc(value)}">
<title>${esc(label)}: ${esc(value)}</title>
<clipPath id="r"><rect width="${w}" height="22" rx="4"/></clipPath>
<g clip-path="url(#r)"><rect width="${lw}" height="22" fill="#0d1117"/><rect x="${lw}" width="${vw}" height="22" fill="${color}"/></g>
<g font-family="Verdana,DejaVu Sans,sans-serif" font-size="11" fill="#fff">
<text x="10" y="15">${esc(label)}</text><text x="${lw + vw / 2}" y="15" text-anchor="middle" font-weight="bold">${esc(value)}</text></g>
</svg>`;
  return new Response(svg, { headers: { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=600', 'access-control-allow-origin': '*' } });
}
