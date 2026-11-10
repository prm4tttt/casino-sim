export const HOUSE_RTP = 0.99;

export const round2 = (x: number) => Math.round(x * 100) / 100;
/** Floor to 2 decimals, tolerant of float noise (e.g. 1.9999999 -> 2.00). */
export const floor2 = (x: number) => Math.floor(x * 100 + 1e-7) / 100;
export const payoutFor = (amount: number, multiplier: number) => floor2(amount * multiplier);

export const fmt = (x: number) =>
  x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtMult = (x: number) =>
  (x >= 1000 ? x.toLocaleString('en-US', { maximumFractionDigits: 0 }) : x.toFixed(2)) + '×';

export function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

/** Partial Fisher-Yates: the first `take` entries of a shuffled 0..n-1. */
export function drawWithoutReplacement(n: number, take: number, floats: number[]): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = 0; i < take; i++) {
    const j = i + Math.floor(floats[i] * (n - i));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, take);
}
