import { HOUSE_RTP, drawWithoutReplacement, floor2 } from '../money';

export const MINES_TILES = 25;

export const minePositions = (floats: number[], mines: number) =>
  drawWithoutReplacement(MINES_TILES, mines, floats);

export function minesMultiplier(mines: number, revealed: number): number {
  if (revealed <= 0) return 1;
  let m = HOUSE_RTP;
  for (let i = 0; i < revealed; i++) m *= (MINES_TILES - i) / (MINES_TILES - mines - i);
  return floor2(m);
}
