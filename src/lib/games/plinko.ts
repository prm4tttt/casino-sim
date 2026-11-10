import { HOUSE_RTP, choose } from '../money';

export type Risk = 'low' | 'medium' | 'high';
export const PLINKO_ROWS = [8, 9, 10, 11, 12, 13, 14, 15, 16] as const;

// Each table is `base + A * d^p`, where d is the bucket's normalised distance
// from the centre and A is solved so the expected return is exactly 99%.
const SHAPE: Record<Risk, { base: number; p: number }> = {
  low: { base: 0.5, p: 2 },
  medium: { base: 0.3, p: 4 },
  high: { base: 0.2, p: 8 },
};

const cache = new Map<string, number[]>();

function roundDown(x: number): number {
  if (x >= 100) return Math.floor(x);
  if (x >= 10) return Math.floor(x * 10) / 10;
  return Math.floor(x * 100) / 100;
}

export function plinkoTable(rows: number, risk: Risk): number[] {
  const key = `${rows}:${risk}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { base, p } = SHAPE[risk];
  const half = rows / 2;
  const d = (k: number) => Math.abs(k - half) / half;
  let expected = 0;
  for (let k = 0; k <= rows; k++) expected += (choose(rows, k) / 2 ** rows) * d(k) ** p;
  const a = (HOUSE_RTP - base) / expected;
  const table = Array.from({ length: rows + 1 }, (_, k) => roundDown(base + a * d(k) ** p));
  cache.set(key, table);
  return table;
}

/** 0 = bounce left, 1 = bounce right. */
export const plinkoPath = (floats: number[], rows: number) =>
  floats.slice(0, rows).map((f) => (f < 0.5 ? 0 : 1));
export const plinkoBucket = (path: number[]) => path.reduce((a, b) => a + b, 0);
