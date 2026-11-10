import { HOUSE_RTP } from '../money';

export const DICE_MIN_CHANCE = 1;
export const DICE_MAX_CHANCE = 98;

/** Roll in 0.00 .. 100.00 */
export const diceRoll = (f: number) => Math.floor(f * 10001) / 100;
/** Win chance in percent for a target. */
export const diceChance = (target: number, over: boolean) => (over ? 100 - target : target);
export const diceMultiplier = (chance: number) => Math.floor((HOUSE_RTP * 100 * 10000) / chance) / 10000;
export const diceWins = (roll: number, target: number, over: boolean) =>
  over ? roll > target : roll < target;
