// Whale exit math. Dependency-free so the live code and the tests use the exact same function.

/**
 * How much the previous big wallets sold, as a share of supply. A wallet that dropped out of the
 * largest-holders list is assumed to hold at most the list's smallest balance, so the estimate
 * never overstates what it cannot see. Buying more never counts as an exit.
 */
export function whaleExit(prev: Record<string, number> | undefined, now: Record<string, number>, floor: number, supply: number) {
  if (!prev || !supply) return undefined;
  let sold = 0;
  for (const [owner, before] of Object.entries(prev)) {
    const after = now[owner] ?? Math.min(before, floor);
    if (after < before) sold += before - after;
  }
  return Math.min(1, sold / supply);
}
