import type { Card } from './cards';

export const cardValue = (c: Card) => (c.rank === 1 ? 11 : Math.min(10, c.rank));

export function handTotal(cards: Card[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += cardValue(c);
    if (c.rank === 1) aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return { total, soft: aces > 0 };
}

export const isBlackjack = (cards: Card[]) => cards.length === 2 && handTotal(cards).total === 21;
export const isBust = (cards: Card[]) => handTotal(cards).total > 21;
export const canSplit = (cards: Card[]) =>
  cards.length === 2 && cardValue(cards[0]) === cardValue(cards[1]);
/** Dealer stands on all 17s. */
export const dealerShouldHit = (cards: Card[]) => handTotal(cards).total < 17;

/**
 * Return multiplier on the hand's stake (0 = lose, 1 = push, 2 = win,
 * 2.5 = natural blackjack). A 21 made after a split is not a natural.
 */
export function settleHand(player: Card[], dealer: Card[], fromSplit: boolean): number {
  const p = handTotal(player).total;
  const d = handTotal(dealer).total;
  const playerBj = !fromSplit && isBlackjack(player);
  const dealerBj = isBlackjack(dealer);
  if (p > 21) return 0;
  if (playerBj && dealerBj) return 1;
  if (playerBj) return 2.5;
  if (dealerBj) return 0;
  if (d > 21 || p > d) return 2;
  return p === d ? 1 : 0;
}
