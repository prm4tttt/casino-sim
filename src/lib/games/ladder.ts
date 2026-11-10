import { HOUSE_RTP, floor2 } from '../money';

export const LADDER_STEPS = 10;
export type Side = 'heads' | 'tails';

export const flip = (f: number): Side => (f < 0.5 ? 'heads' : 'tails');
/** Multiplier after `step` correct calls in a row. */
export const ladderMultiplier = (step: number) => (step <= 0 ? 1 : floor2(HOUSE_RTP * 2 ** step));
