// Small shared UI helpers: stroke icons and initials avatars.

const PATHS: Record<string, string> = {
  home: 'M3 11l9-7 9 7M5 10v10h14V10',
  board: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  watch: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  ledger: 'M4 4h16v16H4zM4 9h16M9 9v11',
  line: 'M12 2v20M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
  apply: 'M12 5v14M5 12h14',
  docs: 'M7 3h7l5 5v13H7zM14 3v5h5',
  faq: 'M9.1 9a3 3 0 115.8 1c0 2-3 3-3 3M12 17h.01M12 22a10 10 0 100-20 10 10 0 000 20z',
  admin: 'M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z',
  search: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3',
  x: 'M4 4l16 16M20 4L4 20',
  share: 'M4 12v8h16v-8M12 3v13M7 8l5-5 5 5',
  github: 'M9 19c-4 1.5-4-2-6-2.5M15 22v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 00-1.3-3.2 4.3 4.3 0 00-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 00-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.3 4.3 0 00-.1 3.2A4.6 4.6 0 004 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V22',
  report: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  badge: 'M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z',
  code: 'M8 9l-4 3 4 3M16 9l4 3-4 3M13.5 6l-3 12',
  alert: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
  chevl: 'M15 18l-6-6 6-6',
  chevr: 'M9 18l6-6-6-6',
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
};

export function Icon({ name, size = 16 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] ?? ''} />
    </svg>
  );
}

const HUES = [150, 205, 225, 265, 290, 330, 25, 45, 185];

/** Deterministic color and initials for an agent, so every avatar is stable. */
export function avatarStyle(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = HUES[h % HUES.length];
  return { background: `linear-gradient(135deg, hsl(${hue} 70% 46%), hsl(${(hue + 40) % 360} 70% 34%))` };
}

export function initials(name: string) {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'TL';
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]).toUpperCase();
}

export function Avatar({ name, seed, size = 26 }: { name: string; seed: string; size?: number }) {
  return (
    <span className="av" style={{ ...avatarStyle(seed), width: size, height: size, fontSize: Math.max(9, size * 0.38) }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
