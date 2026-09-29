import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Inter (SIL OFL, via @fontsource/inter), bundled in assets/fonts so share cards render real weights.
const WEIGHTS = [400, 600, 800] as const;

let cached: Promise<{ name: string; data: Buffer; weight: (typeof WEIGHTS)[number]; style: 'normal' }[]> | null = null;

export function ogFonts() {
  cached ??= Promise.all(
    WEIGHTS.map(async (weight) => ({
      name: 'Inter',
      data: await readFile(join(process.cwd(), 'assets', 'fonts', `inter-latin-${weight}-normal.woff`)),
      weight,
      style: 'normal' as const,
    })),
  ).catch((e) => { cached = null; throw e; });
  return cached;
}
