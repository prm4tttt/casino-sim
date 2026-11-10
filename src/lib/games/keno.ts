import { HOUSE_RTP, choose, drawWithoutReplacement, floor2 } from '../money';
import type { Risk } from './plinko';

export const KENO_NUMBERS = 40;
export const KENO_DRAWN = 10;
export const KENO_MAX_PICKS = 10;

const SHAPE: Record<Risk, { threshold: number; power: number }> = {
  low: { threshold: 0.3, power: 1.6 },
  medium: { threshold: 0.4, power: 2.5 },
  high: { threshold: 0.6, power: 4 },
};

export function kenoHitProb(picks: number, hits: number): number {
  return (
    (choose(picks, hits) * choose(KENO_NUMBERS - picks, KENO_DRAWN - hits)) /
    choose(KENO_NUMBERS, KENO_DRAWN)
  );
}

const cache = new Map<string, number[]>();

/** Multiplier for each hit count 0..picks, normalised to a 99% return. */
export function kenoTable(picks: number, risk: Risk): number[] {
  const key = `${picks}:${risk}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { threshold, power } = SHAPE[risk];
  const t = Math.max(1, Math.ceil(picks * threshold));
  const w = (h: number) => (h < t ? 0 : (h - t + 1) ** power);
  let expected = 0;
  for (let h = 0; h <= picks; h++) expected += kenoHitProb(picks, h) * w(h);
  const scale = HOUSE_RTP / expected;
  const table = Array.from({ length: picks + 1 }, (_, h) => floor2(w(h) * scale));
  cache.set(key, table);
  return table;
}

/** Drawn numbers, 1..40. */
export const kenoDraw = (floats: number[]) =>
  drawWithoutReplacement(KENO_NUMBERS, KENO_DRAWN, floats).map((n) => n + 1);
