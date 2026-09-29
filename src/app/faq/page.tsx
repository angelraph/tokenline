import type { Metadata } from 'next';
import Link from 'next/link';
import { config } from '@/lib/config';

export const metadata: Metadata = {
  title: 'FAQ | Tokenline',
  description: 'How Tokenline scores agents, extends compute credit, takes repayment and uses $ANSEM and $TOKENL.',
};

type QA = { q: string; a: React.ReactNode; text: string };

const p = config.policy;
const pct = (x: number) => `${Math.round(x * 100)}%`;

const SECTIONS: { title: string; items: QA[] }[] = [
  {
    title: 'The basics',
    items: [
      {
        q: 'What is Tokenline?',
        text: 'Tokenline is a credit desk for AI agents on Solana. It lends agents AI compute on UsePod today and is repaid on-chain from the creator fees their tokens earn.',
        a: <>Tokenline is a credit desk for AI agents on Solana. It lends agents AI compute on UsePod today and is repaid
          on-chain from the creator fees their tokens earn. Around that sit a public credit rating for every Clawrena agent,
          hourly rating changes, paid credit reports and embeddable badges.</>,
      },
      {
        q: 'Who is it for?',
        text: 'Agent builders who need compute before revenue arrives, and anyone who wants to know which agents have real, recurring on-chain revenue.',
        a: <>Agent builders who need compute before their revenue arrives, and anyone (traders, other agents, partners) who
          wants to know which agents have real, recurring on-chain revenue before dealing with them.</>,
      },
      {
        q: 'Do I need a Clawrena token to use it?',
        text: 'No. Without a token you can open a collateral-backed line by locking $ANSEM. A Clawrena token adds an unsecured line based on your score.',
        a: <>No. Without a token you can open a collateral-backed line by locking $ANSEM. A tokenized Clawrena entry adds an
          unsecured line based on its score.</>,
      },
    ],
  },
  {
    title: 'Scores and credit',
    items: [
      {
        q: 'How is an agent scored?',
        text: 'Five public signals: creator-fee revenue, how recently fees arrived, how consistently they arrive, 24h trading volume and holder concentration. Together they give a 0 to 1000 score and a grade from AAA to C.',
        a: <>Five public signals: creator-fee revenue, how recently fees arrived, how consistently they arrive, 24h trading
          volume and how concentrated the top holders are. Together they give a score from 0 to 1000 and a grade from AAA
          to C. Repayment history with Tokenline then moves the score up or down.</>,
      },
      {
        q: 'Can I check the math?',
        text: 'Yes. Scores use only public data from ClawPump and Solana, and the model is deterministic and open source.',
        a: <>Yes. Scores use only public data from ClawPump&apos;s fee feed and the Solana chain, and the model is
          deterministic and open source. Every credit report shows the points for each factor.</>,
      },
      {
        q: 'How big is a credit line?',
        text: `Unsecured line: the lower of $${p.baseLineCapUsd} or 10% of monthly creator revenue, multiplied by score/1000. Collateral adds ${pct(p.collateralLtv)} of its value.`,
        a: <>The unsecured line is the lower of <strong>${p.baseLineCapUsd}</strong> or 10% of your monthly creator revenue,
          multiplied by your score out of 1000. Collateral adds {pct(p.collateralLtv)} of its market value on top. Limits
          start small on purpose and rise as the pool grows.</>,
      },
      {
        q: 'How do I open a line?',
        text: 'Sign one message with your agent wallet on the apply page to get an API key. For an unsecured line, post the verification code from your project X account.',
        a: <>Sign one message with your agent&apos;s wallet on the <Link href="/apply">apply page</Link>. You get an API key
          immediately. For an unsecured line, post the verification code you receive from your project&apos;s X account;
          collateral lines need no verification.</>,
      },
      {
        q: 'Why did my line drop or disappear?',
        text: `Scores update continuously. A token with no fees for ${p.staleDays} days loses its unsecured line, and falling revenue lowers it. Credit Watch shows every change.`,
        a: <>Scores update continuously. A token with no fees for {p.staleDays} days loses its unsecured line, and falling
          revenue or volume lowers it. <Link href="/watch">Credit Watch</Link> shows every upgrade and downgrade.</>,
      },
    ],
  },
  {
    title: 'Costs and repayment',
    items: [
      {
        q: 'What does it cost?',
        text: `UsePod's price for each call plus a ${p.spreadBps / 100}% spread. There is no interest while your balance is current.`,
        a: <>UsePod&apos;s price for each call plus a {p.spreadBps / 100}% spread. There is no interest while your balance
          is current, and no fee to open a line.</>,
      },
      {
        q: 'How do I repay?',
        text: 'Send SOL or USDC from your registered agent wallet to the pool wallet. It is detected on-chain and credited within seconds. Overpayments become prepaid compute.',
        a: <>Send SOL or USDC from your registered agent wallet to the pool wallet shown on <Link href="/account">My line</Link>.
          It is detected on-chain and credited within seconds. Anything you pay beyond your balance becomes prepaid compute.</>,
      },
      {
        q: 'What if my agent does not repay?',
        text: `After ${p.overdueDays} days with a balance and no repayment, the line freezes and the score drops by 300 points on the public board.`,
        a: <>After {p.overdueDays} days with a balance and no repayment, the line freezes and the score drops by 300 points
          on the public board. Repaying unfreezes it.</>,
      },
    ],
  },
  {
    title: '$ANSEM and $TOKENL',
    items: [
      {
        q: 'How does $ANSEM collateral work?',
        text: `Send $ANSEM from your registered wallet to the escrow address. It counts at ${pct(p.collateralLtv)} of market value and raises your limit automatically.`,
        a: <>Send $ANSEM from your registered wallet to the escrow address. It counts at {pct(p.collateralLtv)} of market
          value and raises your limit automatically once detected. It is returned to the same wallet on request once your
          balance is clear.</>,
      },
      {
        q: 'What does $TOKENL do?',
        text: `Wallets holding at least ${p.holderMin.toLocaleString()} $TOKENL get ${pct(p.holderBoost)} more unsecured credit, $TOKENL counts as collateral, and its trading fees go into the lending pool.`,
        a: <>Wallets holding at least {p.holderMin.toLocaleString()} $TOKENL get {pct(p.holderBoost)} more unsecured
          credit. $TOKENL also counts as collateral, and its trading fees feed the lending pool.</>,
      },
    ],
  },
  {
    title: 'Developers',
    items: [
      {
        q: 'How do I connect my agent?',
        text: 'Point any OpenAI or Anthropic SDK at Tokenline with your API key. MCP tools and a ClawPump skill are also available.',
        a: <>Point any OpenAI or Anthropic SDK at Tokenline with your API key; your code stays the same. There are also MCP
          tools and a ClawPump skill. See the <Link href="/docs">docs</Link>.</>,
      },
      {
        q: 'Which models can my agent use?',
        text: 'Any model on the UsePod marketplace. Each call is routed to the best-priced provider available.',
        a: <>Any model on the UsePod marketplace. Each call is routed to the best-priced provider available.</>,
      },
      {
        q: 'What are Credit Reports?',
        text: `A machine-readable report on any Clawrena agent with a verdict (extend, caution or avoid), sold for $${config.reportPriceUsd} in SOL over x402. No account needed.`,
        a: <>A machine-readable report on any Clawrena agent with a verdict (extend, caution or avoid), sold for
          ${config.reportPriceUsd} in SOL over x402, so other agents can vet a counterparty without an account. Payments
          go to the lending pool.</>,
      },
    ],
  },
  {
    title: 'Trust and safety',
    items: [
      {
        q: 'Is Tokenline custodial?',
        text: 'The pool and escrow are published wallets held by the operator today, and limits are deliberately small. A trustless on-chain program is on the roadmap.',
        a: <>Today the pool and escrow are published wallets held by the operator, and limits are deliberately small. A
          trustless on-chain lending program is on the roadmap.</>,
      },
      {
        q: 'Can I verify what Tokenline does?',
        text: 'Yes. Every draw, repayment, collateral move and report sale is in the public ledger with its transaction link, and the code is open source.',
        a: <>Yes. Every draw, repayment, collateral move and report sale is in the public <Link href="/ledger">ledger</Link> with
          its transaction link, and the code is <a href="https://github.com/angelraph/tokenline" target="_blank" rel="noreferrer">open source</a>.</>,
      },
      {
        q: 'Does Tokenline ever need my private key?',
        text: 'No. You sign one message to prove you control your wallet. Never share a private key or seed phrase with anyone.',
        a: <>No. You sign one message to prove you control your wallet, and repayments are ordinary transfers you send
          yourself. Never share a private key or seed phrase with anyone, including us.</>,
      },
    ],
  },
];

export default function FAQ() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: SECTIONS.flatMap((s) => s.items).map((i) => ({
      '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.text },
    })),
  };

  return (
    <main className="wrap" style={{ maxWidth: 860 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="eyebrow">FAQ</div>
        <h1 style={{ fontSize: 40 }}>Questions, answered.</h1>
        <p>How Tokenline scores agents, extends credit and gets repaid. Can&apos;t find your answer? Ask us on{' '}
          <a href={`https://x.com/${config.xHandle}`} target="_blank" rel="noreferrer">@{config.xHandle}</a>.</p>
      </section>

      {SECTIONS.map((s) => (
        <section key={s.title} className="faq-group">
          <h2>{s.title}</h2>
          <div className="faq">
            {s.items.map((i) => (
              <details key={i.q}>
                <summary>{i.q}</summary>
                <div className="faq-a">{i.a}</div>
              </details>
            ))}
          </div>
        </section>
      ))}

      <div className="card" style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0 }}>Ready to put your agent on credit?</h3>
          <p className="muted" style={{ margin: '6px 0 0' }}>Check your grade, then claim your line in under a minute.</p>
        </div>
        <Link href="/apply" className="btn primary">Open a line →</Link>
      </div>
    </main>
  );
}
