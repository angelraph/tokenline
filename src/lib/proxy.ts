import { config } from './config';
import { bearer, hashKey } from './keys';
import { position } from './account';
import { upstreamCostUsd, withSpread } from './pricing';
import { store } from './store';
import { usepodPost, upstreamMode, UpstreamError } from './usepod';

type Surface = 'openai' | 'anthropic';
const MAX_TOKENS_CAP = 8192;
const MIN_AVAILABLE_USD = 0.005;

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

const err = (status: number, code: string, message: string, extra: Record<string, unknown> = {}) =>
  json(status, { error: { type: 'tokenline_error', code, message, ...extra } });

/**
 * Credit-metered pass-through to UsePod. The agent's own key authenticates it;
 * Tokenline's pool pays UsePod; the metered cost + spread is booked as debt.
 */
export async function proxy(req: Request, surface: Surface): Promise<Response> {
  const key = bearer(req);
  if (!key) return err(401, 'missing_key', 'Send your Tokenline key as "Authorization: Bearer tl_..."');
  const agent = await store.getAgentByKeyHash(hashKey(key));
  if (!agent) return err(401, 'invalid_key', 'Unknown Tokenline key');

  const pos = await position(agent);
  if (pos.availableUsd < MIN_AVAILABLE_USD) {
    return err(402, 'line_exhausted', `No credit available (status: ${pos.status}). Repay or add $ANSEM collateral.`, {
      limit_usd: pos.limitUsd, outstanding_usd: pos.outstandingUsd, repay_to: config.poolWallet,
    });
  }
  if (upstreamMode() === 'none') return err(503, 'upstream_unconfigured', 'Pool has no UsePod route configured');

  let body: Record<string, any>;
  try { body = await req.json(); } catch { return err(400, 'bad_json', 'Body must be JSON'); }
  if (!body.model) return err(400, 'missing_model', '"model" is required');

  // Hard ceiling on output so one call can't blow far past the line.
  const mt = surface === 'openai' ? (body.max_completion_tokens ?? body.max_tokens) : body.max_tokens;
  const cap = Math.min(MAX_TOKENS_CAP, Number(mt) || (surface === 'anthropic' ? 1024 : MAX_TOKENS_CAP));
  if (surface === 'openai') { delete body.max_completion_tokens; body.max_tokens = cap; } else body.max_tokens = cap;
  const stream = body.stream === true;
  if (stream && surface === 'openai') body.stream_options = { ...(body.stream_options ?? {}), include_usage: true };

  const path = surface === 'openai' ? '/v1/chat/completions' : '/v1/messages';
  const headers: Record<string, string> = {};
  for (const [k, v] of req.headers) if (k.toLowerCase().startsWith('x-pod-')) headers[k] = v;
  if (surface === 'anthropic') headers['anthropic-version'] = req.headers.get('anthropic-version') ?? '2023-06-01';

  let upstream: Response, payment: { signature: string; lamports: number } | null;
  try {
    ({ res: upstream, payment } = await usepodPost(path, body, headers));
  } catch (e) {
    if (e instanceof UpstreamError) return err(e.status, e.code, e.message);
    return err(502, 'upstream_unreachable', 'UsePod could not be reached');
  }

  const route = {
    route: upstream.headers.get('x-pod-route'),
    provider: upstream.headers.get('x-pod-provider-id'),
    balance: upstream.headers.get('x-balance-remaining'),
    x402Signature: payment?.signature ?? null,
    x402Lamports: payment?.lamports ?? null,
  };

  // $TOKENL holders pay a lower markup on every draw.
  const spreadBps = pos.holderBoost ? config.policy.holderSpreadBps : config.policy.spreadBps;

  const book = async (inTok: number, outTok: number, model: string) => {
    const upstreamUsd = upstreamCostUsd(model, inTok, outTok);
    const charged = withSpread(upstreamUsd, spreadBps);
    if (charged <= 0) return 0;
    await store.addEvent({
      agentId: agent.id, type: 'draw', amountUsd: charged, asset: null, amount: null, txSig: null,
      meta: { model, surface, inputTokens: inTok, outputTokens: outTok, upstreamUsd, spreadBps, ...route },
    });
    return charged;
  };

  if (!upstream.ok) {
    return new Response(upstream.body, { status: upstream.status, headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' } });
  }

  if (!stream) {
    const data = await upstream.json();
    const u = data.usage ?? {};
    const inTok = u.prompt_tokens ?? u.input_tokens ?? 0;
    const outTok = u.completion_tokens ?? u.output_tokens ?? 0;
    const charged = await book(inTok, outTok, data.model ?? body.model);
    return json(200, data, {
      'x-tokenline-charged-usd': charged.toFixed(6),
      'x-tokenline-available-usd': Math.max(0, pos.availableUsd - charged).toFixed(4),
      ...(route.route ? { 'x-pod-route': route.route } : {}),
      ...(route.x402Signature ? { 'x-tokenline-payment-tx': route.x402Signature } : {}),
    });
  }

  // Streaming: pass bytes through untouched while sniffing SSE usage frames.
  let inTok = 0, outTok = 0, model = String(body.model), buf = '';
  const dec = new TextDecoder();
  const sniff = (chunk: Uint8Array) => {
    buf += dec.decode(chunk, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const ev = JSON.parse(payload);
        if (ev.model) model = ev.model;
        const u = ev.usage ?? ev.message?.usage;
        if (u) {
          inTok = u.prompt_tokens ?? u.input_tokens ?? inTok;
          outTok = u.completion_tokens ?? u.output_tokens ?? outTok;
        }
      } catch { /* partial or non-JSON frame */ }
    }
  };
  const ts = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, ctl) { sniff(chunk); ctl.enqueue(chunk); },
    async flush() { await book(inTok, outTok, model); },
  });
  return new Response(upstream.body!.pipeThrough(ts), {
    status: 200,
    headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', ...(route.route ? { 'x-pod-route': route.route } : {}) },
  });
}
