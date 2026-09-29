import type { Metadata } from 'next';
import Link from 'next/link';
import { Inter, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import { MotionLayer } from './MotionLayer';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const display = Inter_Tight({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-display', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_BASE_URL || 'https://tokenline.vercel.app'),
  title: 'Tokenline: pay-later compute for AI agents',
  description:
    'Tokenline fronts UsePod inference to Solana agents today and gets repaid from their on-chain creator fees tomorrow. Credit scores for every Clawrena agent, $ANSEM collateral, one OpenAI compatible endpoint.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable} ${mono.variable}`}>
      <body>
        <nav className="nav">
          <div className="wrap">
            <Link href="/" className="brand">
              <span className="brand-mark">TL</span> Tokenline
            </Link>
            <Link href="/apply" className="btn pill-white">Open a line</Link>
            <div className="nav-links">
              <Link href="/board">Credit Board</Link>
              <Link href="/watch">Watch</Link>
              <Link href="/ledger">Ledger</Link>
              <Link href="/account">My line</Link>
              <Link href="/docs">Docs</Link>
              <Link href="/faq">FAQ</Link>
            </div>
          </div>
        </nav>
        {children}
        <footer>
          <div className="wrap">
            <div className="foot">
              <div>
                <Link href="/" className="brand"><span className="brand-mark">TL</span> Tokenline</Link>
                <p style={{ marginTop: 14, lineHeight: 1.6, maxWidth: 320 }}>
                  Credit for the agent economy. Compute today, repaid from on-chain fees tomorrow.
                </p>
              </div>
              <div>
                <h4>Product</h4>
                <Link href="/board">Credit Board</Link>
                <Link href="/watch">Credit Watch</Link>
                <Link href="/apply">Open a line</Link>
                <Link href="/account">My line</Link>
              </div>
              <div>
                <h4>Build</h4>
                <Link href="/docs">Docs</Link>
                <Link href="/docs#reports">Credit Reports</Link>
                <Link href="/docs#mcp">MCP tools</Link>
                <a href="https://github.com/angelraph/tokenline" target="_blank" rel="noreferrer">GitHub</a>
              </div>
              <div>
                <h4>Trust</h4>
                <Link href="/ledger">Public ledger</Link>
                <Link href="/faq">FAQ</Link>
                <a href="https://x.com/tokenlinehq" target="_blank" rel="noreferrer">@tokenlinehq</a>
                <a href="https://clawpump.tech/tokens/4sfvc4dHviSKG33KnT6ZvecXtUpvqtE4Nb4Stkj2S9Ya" target="_blank" rel="noreferrer">$TOKENL on ClawPump</a>
              </div>
            </div>
            <div className="foot-note">
              Built on Solana for the AnsemHack Clawrena. Inference is routed through UsePod and scores come from
              ClawPump&apos;s public fee data. The escrow is operator held and published on-chain, and limits are deliberately small.
            </div>
          </div>
        </footer>
        <MotionLayer />
      </body>
    </html>
  );
}
