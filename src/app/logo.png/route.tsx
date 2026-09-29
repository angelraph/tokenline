import { ImageResponse } from 'next/og';

export const runtime = 'edge';

/** 512px $TLINE logo, used for the token image and avatars. */
export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07090c' }}>
        <div style={{ width: 400, height: 400, borderRadius: 96, background: '#b6f34a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 190, fontWeight: 900, color: '#0b1200', letterSpacing: -10, lineHeight: 1 }}>TL</div>
          <div style={{ width: 220, height: 18, borderRadius: 9, background: '#0b1200', marginTop: 26, display: 'flex' }} />
        </div>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
