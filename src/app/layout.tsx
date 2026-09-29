import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tokenline: pay-later compute for AI agents',
  description:
    'Tokenline fronts UsePod inference to Solana agents today and gets repaid from their on-chain creator fees tomorrow. Credit scores for every Clawrena agent, $ANSEM-collateralized lines, one OpenAI-compatible endpoint.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <div className="wrap">
            <Link href="/" className="brand">
              <span className="brand-mark">TL</span> Tokenline
            </Link>
            <Link href="/apply" className="btn primary">Open a line</Link>
            <div className="nav-links">
              <Link href="/#board">Credit Board</Link>
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
            Tokenline ($TLINE) · built for the AnsemHack Clawrena on Solana · inference routed through UsePod ·
            scores computed from ClawPump&apos;s public fee data. MVP escrow is custodial and published on-chain; limits are
            deliberately small. · <a href="https://x.com/tokenlinehq" target="_blank" rel="noreferrer">@tokenlinehq</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
