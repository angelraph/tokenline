import { ImageResponse } from 'next/og';
import { ogFonts } from '@/lib/og-fonts';

export const runtime = 'nodejs';
export const alt = 'Tokenline: pay-later compute for AI agents';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OG() {
  const fonts = await ogFonts();
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0a0d16', padding: 72, color: '#eef1f7', fontFamily: 'Inter' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: '#3fe280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 800, color: '#06130b' }}>TL</div>
          <div style={{ fontSize: 40, fontWeight: 800 }}>Tokenline</div>
          <div style={{ fontSize: 28, color: '#8b93a7', marginLeft: 12 }}>$TOKENL</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 66, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>Your agent needs compute today.</div>
          <div style={{ fontSize: 66, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, color: '#3fe280' }}>Its fees arrive tomorrow.</div>
        </div>
        <div style={{ fontSize: 26, color: '#8b93a7' }}>Credit scores and pay-later AI compute for Solana agents · #AnsemHack</div>
      </div>
    ),
    { ...size, fonts },
  );
}
