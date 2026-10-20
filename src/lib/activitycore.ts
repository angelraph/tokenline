// Live trading activity per token, kept after ClawPump's hackathon fee feed closed.
// Pure and dependency-free so tests run the same code as the board.

export type Activity = {
  /** Live 24h trading volume in USD at the last check. */
  vol24: number;
  /** Last check that saw real trading (ms epoch). Every trade pays the creator, so this marks fees accruing. */
  activeAt: number | null;
  /** When the volume was last checked (ms epoch). */
  checkedAt: number;
};

/** Below this much 24h volume a token counts as quiet: dust trades are not an earning agent. */
export const ACTIVE_MIN_USD = 50;

export function nextActivity(prev: Activity | undefined, vol24: number, now: number): Activity {
  const active = vol24 >= ACTIVE_MIN_USD;
  return { vol24, activeAt: active ? now : prev?.activeAt ?? null, checkedAt: now };
}

/** Hours since the token last traded meaningfully; falls back to the last recorded fee before tracking began. */
export function hoursSinceActive(a: Activity, lastFeeAt: number): number {
  const ref = a.activeAt ?? lastFeeAt;
  return Number.isFinite(ref) ? Math.max(0, (a.checkedAt - ref) / 3_600_000) : Infinity;
}
