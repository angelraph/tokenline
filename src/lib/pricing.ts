// Upstream cost estimate, USD per 1M tokens. Conservative (at or above UsePod's
// centralized cap) so the pool never under-bills. Matched by substring, first hit wins.
const TABLE: [RegExp, { in: number; out: number }][] = [
  [/opus/i, { in: 15, out: 75 }],
  [/sonnet|gpt-5(?!.*mini)|gpt-4o(?!-mini)/i, { in: 3, out: 15 }],
  [/deepseek|qwen|llama|kimi|glm|mistral/i, { in: 0.6, out: 2.4 }],
  [/haiku|mini|flash|small/i, { in: 1, out: 5 }],
];
const DEFAULT = { in: 3, out: 15 };

export function upstreamCostUsd(model: string, inputTokens: number, outputTokens: number) {
  const p = TABLE.find(([re]) => re.test(model))?.[1] ?? DEFAULT;
  return (inputTokens * p.in + outputTokens * p.out) / 1_000_000;
}

export function withSpread(costUsd: number, spreadBps: number) {
  return costUsd * (1 + spreadBps / 10_000);
}
