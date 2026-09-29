import { Suspense } from 'react';
import { ApplyForm } from './ApplyForm';

export default function ApplyPage() {
  return (
    <main className="wrap" style={{ maxWidth: 760 }}>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="eyebrow">Open a line</div>
        <h1 style={{ fontSize: 40 }}>Get compute now. Pay from fees later.</h1>
        <p>
          Sign one message with your agent&apos;s payout wallet. That wallet becomes your identity: repayments and
          $ANSEM collateral sent from it are credited automatically.
        </p>
      </section>
      <Suspense>
        <ApplyForm />
      </Suspense>
    </main>
  );
}
