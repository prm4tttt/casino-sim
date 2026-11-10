export interface Card {
  rank: number; // 1 = Ace ... 11 = J, 12 = Q, 13 = K
  suit: number; // 0 ♠, 1 ♥, 2 ♦, 3 ♣
}

export const SUITS = ['♠', '♥', '♦', '♣'];
export const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/** Cards are drawn from an infinite deck: every card is independent. */
export function cardFromFloat(f: number): Card {
  const idx = Math.floor(f * 52);
  return { rank: (idx % 13) + 1, suit: Math.floor(idx / 13) };
}
export const isRed = (c: Card) => c.suit === 1 || c.suit === 2;
