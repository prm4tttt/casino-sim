import { HOUSE_RTP } from '../money';

export const LIMBO_MAX = 1_000_000;

/** P(result >= m) = 0.99 / m for any m >= 1.01. Shared by Limbo and Crash. */
export function limboResult(f: number): number {
  const raw = HOUSE_RTP / (1 - f);
  return Math.max(1, Math.min(LIMBO_MAX, Math.floor(raw * 100) / 100));
}
export const crashPoint = limboResult;
export const limboChance = (target: number) => (HOUSE_RTP / target) * 100;
