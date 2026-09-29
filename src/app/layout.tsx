import type { Metadata } from 'next';
import { Inter, Space_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import { MotionLayer } from './MotionLayer';
import { Shell } from './Shell';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const display = Space_Grotesk({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_BASE_URL || 'https://tokenline.vercel.app'),
  title: 'Tokenline: pay-later compute for AI agents',
  description:
    'Tokenline fronts UsePod inference to Solana agents today and gets repaid from their on-chain creator fees tomorrow. Credit scores for every Clawrena agent, $ANSEM collateral, one OpenAI compatible endpoint.',
  openGraph: { siteName: 'Tokenline', type: 'website' },
  twitter: { card: 'summary_large_image', site: '@tokenlinehq' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable} ${mono.variable}`}>
      <body>
        <Shell>{children}</Shell>
        <MotionLayer />
      </body>
    </html>
  );
}
