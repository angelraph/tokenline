import { config } from '@/lib/config';

export default function Docs() {
  const base = config.baseUrl;
  return (
    <main className="wrap" style={{ maxWidth: 900 }}>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="eyebrow">Docs</div>
        <h1 style={{ fontSize: 40 }}>Two lines to put your agent on credit.</h1>
        <p>Tokenline speaks the OpenAI and Anthropic APIs. Change the base URL, keep your code.</p>
      </section>

      <div className="section">
        <h2>1 · OpenAI SDK (Python / TS)</h2>
        <pre className="code">{`from openai import OpenAI
client = OpenAI(base_url="${base}/v1", api_key="tl_...")
r = client.chat.completions.create(model="deepseek-v4-1-flash",
                                   messages=[{"role": "user", "content": "gm"}])`}</pre>
        <p className="muted">Every call is routed to the best-priced UsePod provider. The response carries
          <code> x-tokenline-charged-usd</code> and <code>x-tokenline-available-usd</code>. Pass any <code>X-Pod-*</code> header
          (max price, routing mode, providers) and it goes straight through to UsePod.</p>
      </div>

      <div className="section">
        <h2>2 · Anthropic SDK</h2>
        <pre className="code">{`import anthropic
client = anthropic.Anthropic(base_url="${base}", api_key="tl_...")
client.messages.create(model="claude-sonnet-5", max_tokens=512,
                       messages=[{"role": "user", "content": "gm"}])`}</pre>
      </div>

      <div className="section" id="mcp">
        <h2>3 · ClawPump / Hermes agents (MCP)</h2>
        <p className="muted">Tokenline runs a remote MCP server, so there is nothing to install. Add the URL next to <code>@clawpump/agents</code> in any MCP client. Public tools work without a key; credit tools use your <code>tl_</code> key. The agent gets six tools:</p>
        <pre className="code">{`{
  "mcpServers": {
    "tokenline": {
      "url": "${base}/mcp",
      "headers": { "Authorization": "Bearer tl_..." }
    }
  }
}`}</pre>
        <p className="sub">Prefer a local process? Clone the GitHub repo, run <code>npm install &amp;&amp; npm run build</code> in <code>mcp/</code>, and start <code>node mcp/dist/index.js</code> with <code>TOKENLINE_URL</code> and <code>TOKENLINE_KEY</code> set.</p>
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead><tr><th>Tool</th><th>What it does</th></tr></thead>
            <tbody>
              <tr><td className="mono">tl_check_credit</td><td>Limit, available, outstanding, grade and repay address</td></tr>
              <tr><td className="mono">tl_think</td><td>Run an LLM call on credit (drawn from the line)</td></tr>
              <tr><td className="mono">tl_repay_quote</td><td>Exact amount owed plus a Solana Pay link to settle it</td></tr>
              <tr><td className="mono">tl_score</td><td>Credit report for any Clawrena mint, for vetting counterparties</td></tr>
              <tr><td className="mono">tl_board</td><td>Top-rated agents on the Credit Board</td></tr>
              <tr><td className="mono">tl_watch</td><td>Recent upgrades, downgrades and pulled lines</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="section" id="plugins">
        <h2>Agent framework plugins</h2>
        <p className="muted">Drop Tokenline into the two most used Solana agent frameworks. Source lives in the <a href="https://github.com/angelraph/tokenline/tree/master/plugins" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>plugins folder</a>.</p>
        <pre className="code">{`// Solana Agent Kit v2
const agent = new SolanaAgentKit(wallet, rpcUrl, {})
  .use(createTokenlinePlugin({ apiKey: process.env.TOKENLINE_KEY }));
// actions: TOKENLINE_SCORE, TOKENLINE_BOARD, TOKENLINE_WATCH, TOKENLINE_CHECK_CREDIT,
//          TOKENLINE_THINK, TOKENLINE_REPAY, TOKENLINE_LOCK_ANSEM

// ElizaOS v1
export const character = { name: 'MyAgent', plugins: [tokenlinePlugin],
  secrets: { TOKENLINE_KEY: 'tl_...' } };`}</pre>
        <p className="sub">Repay and collateral are built by Tokenline&apos;s Solana Actions endpoints and signed by the agent&apos;s own wallet. The key never leaves the agent.</p>
      </div>

      <div className="section" id="blinks">
        <h2>Solana Blinks</h2>
        <p className="muted">Repay, lock $ANSEM or buy a credit report from any Blink client. Share links unfurl as Blinks.</p>
        <pre className="code">{`${base}/repay                 repay your line in SOL
${base}/lock                  lock $ANSEM as collateral
${base}/agent/<mint>          buy that agent's verified report
${base}/actions.json          Solana Actions discovery`}</pre>
      </div>

      <div className="section" id="reports">
        <h2>4 · Credit reports over x402</h2>
        <p className="muted">A machine-readable report with a counterparty verdict (<code>extend</code>, <code>caution</code>, <code>avoid</code>) for
          ${config.reportPriceUsd} in SOL, paid straight to the lending pool. It uses the same x402 wire format as UsePod, so no account is needed.</p>
        <pre className="code">{`GET /api/x402/report/:mint
  -> 402 + PAYMENT-REQUIRED: base64 {quote_id, accepts:[{asset:"SOL", pay_to, amount_microunits}]}
send amount_microunits lamports to pay_to, then:
GET /api/x402/report/:mint
  PAYMENT-SIGNATURE: base64 {quote_id, network, asset:"SOL", payer_wallet, signature}
  -> 200 {grade, score, verdict, reason, factors, memo, receipt}`}</pre>
      </div>

      <div className="section" id="badge">
        <h2>5 · Credit badge</h2>
        <p className="muted">An SVG image of any agent&apos;s current grade, regenerated from its score every few minutes. Paste it once into a README or website and it stays accurate.</p>
        <pre className="code">{`[![Tokenline credit](${base}/api/badge/<mint>)](${base}/agent/<mint>)`}</pre>
      </div>

      <div className="section">
        <h2>How credit works</h2>
        <div className="grid2">
          <div className="card">
            <h3>Unsecured line</h3>
            <p className="muted">Set by your score: <code>min(${config.policy.baseLineCapUsd}, 10% × monthly creator revenue) × score/1000</code>.
              It unlocks after you post your verification code from your project&apos;s X account. Holding
              ≥{config.policy.holderMin.toLocaleString()} $TOKENL adds {config.policy.holderBoost * 100}%.</p>
          </div>
          <div className="card">
            <h3>Collateral line</h3>
            <p className="muted">$ANSEM sent to escrow from your registered wallet counts at {config.policy.collateralLtv * 100}% of market value.
              This works for any agent, even without a Clawrena token.</p>
          </div>
          <div className="card">
            <h3>Pricing</h3>
            <p className="muted">UsePod cost + {config.policy.spreadBps / 100}% spread. No interest while you are current. Repay any time; overpayments become prepaid compute.</p>
          </div>
          <div className="card">
            <h3>Delinquency</h3>
            <p className="muted">No repayment for {config.policy.overdueDays} days with a balance outstanding freezes the line and costs 300 score
              points, visible on the public board. Dormant tokens (no fees in {config.policy.staleDays} days) lose their unsecured line.</p>
          </div>
        </div>
      </div>

      <div className="section">
        <h2>Public API</h2>
        <pre className="code">{`GET  /api/board              every Clawrena entry, scored
GET  /api/score/:mint        full credit report + memo
GET  /api/pool               pool totals, spread revenue, default rate
GET  /api/watch?hours=24     rating actions: upgrades, downgrades, pulled lines
GET  /api/badge/:mint        SVG credit badge (current grade)
GET  /api/x402/report/:mint  paid credit report with verdict (x402, SOL)
GET  /api/ledger             public event ledger
GET  /api/me                 (Bearer tl_) your position
POST /v1/chat/completions    (Bearer tl_) OpenAI-compatible, metered
POST /v1/messages            (Bearer tl_) Anthropic-compatible, metered`}</pre>
      </div>
    </main>
  );
}
