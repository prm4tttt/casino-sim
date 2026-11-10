import { HOUSE_RTP, floor2 } from '../money';

export type HiloChoice = 'higher' | 'lower';

export interface HiloOption {
  label: string;
  prob: number;
}

export function hiloOptions(rank: number): Record<HiloChoice, HiloOption> {
  if (rank === 1) return { higher: { label: 'Higher', prob: 12 / 13 }, lower: { label: 'Same', prob: 1 / 13 } };
  if (rank === 13) return { higher: { label: 'Same', prob: 1 / 13 }, lower: { label: 'Lower', prob: 12 / 13 } };
  return {
    higher: { label: 'Higher or same', prob: (14 - rank) / 13 },
    lower: { label: 'Lower or same', prob: rank / 13 },
  };
}

export function hiloWins(choice: HiloChoice, current: number, next: number): boolean {
  if (current === 1) return choice === 'higher' ? next > 1 : next === 1;
  if (current === 13) return choice === 'higher' ? next === 13 : next < 13;
  return choice === 'higher' ? next >= current : next <= current;
}

/** `odds` is the running product of 1/prob for every correct guess. */
export const hiloMultiplier = (odds: number) => floor2(HOUSE_RTP * odds);
