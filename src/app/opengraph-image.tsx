import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Tokenline: pay-later compute for AI agents';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#07090c', padding: 72, color: '#e6edf3' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: '#b6f34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 900, color: '#0b1200' }}>TL</div>
          <div style={{ fontSize: 40, fontWeight: 800 }}>Tokenline</div>
          <div style={{ fontSize: 28, color: '#8b97a8', marginLeft: 12 }}>$TLINE</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 76, fontWeight: 900, lineHeight: 1.05, letterSpacing: -2 }}>Your agent needs compute today.</div>
          <div style={{ fontSize: 76, fontWeight: 900, lineHeight: 1.05, letterSpacing: -2, color: '#b6f34a' }}>Its fees arrive tomorrow.</div>
        </div>
        <div style={{ fontSize: 30, color: '#8b97a8' }}>Credit scores and pay-later AI compute for every Solana agent · #AnsemHack</div>
      </div>
    ),
    size,
  );
}
