import { ImageResponse } from 'next/og';
import { scoreForMint } from '@/lib/account';
import { ogFonts } from '@/lib/og-fonts';
import { avatarStyle, initials } from '../../ui';

export const runtime = 'nodejs';
export const alt = 'Tokenline credit report';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
// Scores move hourly; let X and Discord refetch a fresh card.
export const revalidate = 3600;

const C = {
  bg: '#0a0d16', panel: '#0f1320', line: '#1c2233', text: '#eef1f7', muted: '#8b93a7',
  accent: '#3fe280', cyan: '#6ae4ff', warn: '#f5b041', bad: '#ff5c6c', track: '#1b2236',
};

const gradeColor = (g: string) =>
  g === 'AAA' || g === 'AA' ? C.accent : g === 'A' || g === 'BBB' ? C.cyan : g === 'BB' || g === 'B' ? C.warn : C.bad;

const money = (x: number) => `$${Math.round(x).toLocaleString('en-US')}`;

function Brand() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 11, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#06130b' }}>TL</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>Tokenline</div>
      <div style={{ fontSize: 22, color: C.muted }}>Credit report</div>
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  const [r, fonts] = await Promise.all([scoreForMint(mint).catch(() => null), ogFonts()]);
  const opts = { ...size, fonts };

  if (!r) {
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: C.bg, padding: 64, color: C.text, fontFamily: 'Inter' }}>
          <Brand />
          <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -1.5 }}>Credit scores for every Clawrena agent.</div>
          <div style={{ fontSize: 26, color: C.muted }}>tokenline.vercel.app</div>
        </div>
      ),
      size,
    );
  }

  const { project, score } = r;
  const gc = gradeColor(score.grade);
  const factors = score.components.filter((c) => c.max > 0);
  const name = project.projectName.length > 26 ? `${project.projectName.slice(0, 25)}…` : project.projectName;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: C.bg, padding: '52px 64px', color: C.text, fontFamily: 'Inter' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Brand />
          <div style={{ fontSize: 22, color: C.muted }}>tokenline.vercel.app</div>
        </div>

        <div style={{ display: 'flex', flex: 1, gap: 48, marginTop: 40 }}>
          <div style={{ display: 'flex', flexDirection: 'column', width: 560 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ ...avatarStyle(mint), width: 76, height: 76, borderRadius: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 700, color: '#fff' }}>
                {initials(project.projectName)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1 }}>{name}</div>
                <div style={{ fontSize: 24, color: C.muted }}>{`$${project.symbol}${project.xHandle ? `  ·  @${project.xHandle}` : ''}`}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22, marginTop: 40 }}>
              <div style={{ fontSize: 132, fontWeight: 800, lineHeight: 1, letterSpacing: -4 }}>{String(score.score)}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 12 }}>
                <div style={{ display: 'flex', fontSize: 34, fontWeight: 800, color: gc, border: `2px solid ${gc}`, borderRadius: 10, padding: '2px 16px' }}>{score.grade}</div>
                <div style={{ fontSize: 22, color: C.muted }}>out of 1000</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, marginTop: 36 }}>
              <div style={{ display: 'flex', flexDirection: 'column', background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: '18px 22px', flex: 1 }}>
                <div style={{ fontSize: 18, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Pre-approved line</div>
                <div style={{ fontSize: 36, fontWeight: 700, color: score.lineUsd > 0 ? C.accent : C.muted, marginTop: 6 }}>
                  {score.lineUsd > 0 ? `$${score.lineUsd.toFixed(2)}` : 'None yet'}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: '18px 22px', flex: 1 }}>
                <div style={{ fontSize: 18, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Creator revenue</div>
                <div style={{ fontSize: 36, fontWeight: 700, marginTop: 6 }}>{`${money(score.monthlyCreatorUsd)}/mo`}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, padding: '26px 30px', gap: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>On-chain signals</div>
            {factors.map((f) => (
              <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20 }}>
                  <span>{f.label}</span>
                  <span style={{ color: C.muted }}>{`${f.points}/${f.max}`}</span>
                </div>
                <div style={{ display: 'flex', height: 8, background: C.track, borderRadius: 4 }}>
                  <div style={{ width: `${Math.max(0, Math.min(100, (f.points / f.max) * 100))}%`, background: gc, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    opts,
  );
}
