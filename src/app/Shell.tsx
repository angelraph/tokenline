'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search } from './Search';
import { Icon } from './ui';

const TOKEN_URL = 'https://clawpump.tech/tokens/4sfvc4dHviSKG33KnT6ZvecXtUpvqtE4Nb4Stkj2S9Ya';

const NAV = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/board', label: 'Credit Board', icon: 'board' },
  { href: '/watch', label: 'Credit Watch', icon: 'watch' },
  { href: '/ledger', label: 'Ledger', icon: 'ledger' },
];
const ACCOUNT = [
  { href: '/apply', label: 'Open a line', icon: 'apply' },
  { href: '/account', label: 'My line', icon: 'line' },
];
const LEARN = [
  { href: '/docs', label: 'Docs', icon: 'docs' },
  { href: '/faq', label: 'FAQ', icon: 'faq' },
];

function Footer() {
  return (
    <footer>
      <div className="foot-strip">
        <Link href="/board">Credit Board</Link><span>·</span>
        <Link href="/docs">API docs</Link><span>·</span>
        <Link href="/ledger">Public ledger</Link><span>·</span>
        <a href="https://github.com/angelraph/tokenline" target="_blank" rel="noreferrer">GitHub</a><span>·</span>
        <a href="https://x.com/tokenlinehq" target="_blank" rel="noreferrer">@tokenlinehq</a><span>·</span>
        <a href={TOKEN_URL} target="_blank" rel="noreferrer">$TOKENL</a><span>·</span>
        <span>© 2026 Tokenline</span>
      </div>
      <div className="foot-note">
        Built on Solana for the AnsemHack Clawrena. Inference is routed through UsePod and scores come from ClawPump&apos;s
        public fee data. The escrow is operator held and published on-chain, and limits are deliberately small.
      </div>
    </footer>
  );
}

function isActive(path: string, href: string) {
  return href === '/' ? path === '/' : path === href || path.startsWith(href + '/');
}

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? '/';

  if (path === '/') {
    return (
      <>
        <nav className="nav">
          <div className="wrap">
            <Link href="/" className="brand"><span className="brand-mark">TL</span> Tokenline</Link>
            <div className="nav-links">
              <Link href="/board">Credit Board</Link>
              <Link href="/watch">Watch</Link>
              <Link href="/ledger">Ledger</Link>
              <Link href="/docs">Docs</Link>
              <Link href="/faq">FAQ</Link>
            </div>
            <div className="nav-cta">
              <Link href="/account" className="btn ghost sm">My line</Link>
              <Link href="/apply" className="btn primary sm">Open a line</Link>
            </div>
          </div>
        </nav>
        {children}
        <div className="wrap"><Footer /></div>
      </>
    );
  }

  const link = (n: { href: string; label: string; icon: string }) => (
    <Link key={n.href} href={n.href} className={`side-link${isActive(path, n.href) ? ' active' : ''}`}>
      <Icon name={n.icon} /> {n.label}
    </Link>
  );

  return (
    <div className="shell">
      <aside className="side">
        <Link href="/" className="brand"><span className="brand-mark">TL</span> Tokenline</Link>
        <nav className="side-nav">
          {NAV.map(link)}
          <div className="side-label">Account</div>
          {ACCOUNT.map(link)}
          <div className="side-label">Learn</div>
          {LEARN.map(link)}
        </nav>
        <div className="side-foot">
          <div className="side-card">
            <span className="pill live" style={{ marginBottom: 8 }}><span className="dot" /> mainnet</span>
            <div>Every line is paid and repaid on <b>Solana</b>. Receipts are on the <Link href="/ledger" style={{ color: 'var(--accent)' }}>ledger</Link>.</div>
          </div>
          <a className="side-link" href={TOKEN_URL} target="_blank" rel="noreferrer"><Icon name="badge" /> $TOKENL</a>
        </div>
      </aside>
      <div className="appmain">
        <div className="mbar">
          <Link href="/" className="brand"><span className="brand-mark">TL</span> Tokenline</Link>
          <Link href="/apply" className="btn primary sm">Open a line</Link>
        </div>
        <nav className="mnav">
          {[...NAV.slice(1), ...ACCOUNT, ...LEARN].map((n) => (
            <Link key={n.href} href={n.href} className={isActive(path, n.href) ? 'active' : ''}>{n.label}</Link>
          ))}
        </nav>
        <div className="topbar">
          <Search />
          <div className="spacer" />
          <a className="btn ghost sm desk-only" href="https://x.com/tokenlinehq" target="_blank" rel="noreferrer">@tokenlinehq</a>
          <Link href="/apply" className="btn primary sm desk-only">Open a line</Link>
        </div>
        <div className="page">{children}</div>
        <Footer />
      </div>
    </div>
  );
}
