import type { Metadata } from 'next';
import { Suspense } from 'react';
import { config } from '@/lib/config';
import { LinkWallet } from './LinkWallet';

export const metadata: Metadata = {
  title: 'Holder alerts | Tokenline',
  description: 'Real-time Credit Watch alerts in Telegram for wallets holding $TOKENL.',
};

export default function Alerts() {
  return (
    <main className="wrap">
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="eyebrow">Holder alerts</div>
        <h1 style={{ fontSize: 40 }}>Hear about every move first.</h1>
        <p>
          Wallets holding {config.policy.holderMin.toLocaleString('en-US')}+ $TOKENL get Credit Watch alerts in Telegram as they happen:
          upgrades, downgrades, new credit lines and volume spikes on every Clawrena agent.
        </p>
      </section>
      <div className="card" style={{ maxWidth: 560 }}>
        <h3>How it works</h3>
        <ol className="muted" style={{ paddingLeft: 18, lineHeight: 1.8, margin: '0 0 16px' }}>
          <li>Send <code>/alerts</code> to <a href="https://t.me/tokenhqbot" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>@tokenhqbot</a> on Telegram.</li>
          <li>Open the link it sends you and sign one message with your wallet. Signing is free and moves no funds.</li>
          <li>Tokenline checks your $TOKENL balance on-chain and switches alerts on. Balances are re-checked daily.</li>
        </ol>
        <Suspense fallback={null}><LinkWallet min={config.policy.holderMin} /></Suspense>
      </div>
    </main>
  );
}
