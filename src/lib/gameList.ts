import {
  ArrowUpDown,
  Bomb,
  Coins,
  Dice5,
  Grid3x3,
  KeyRound,
  Rocket,
  Spade,
  TrendingUp,
  Triangle,
  type LucideIcon,
} from 'lucide-react';
import type { GameId } from '../store/useStore';

export interface GameMeta {
  id: GameId;
  name: string;
  path: string;
  icon: LucideIcon;
  blurb: string;
  original?: boolean;
  /** Tailwind gradient classes for the lobby tile. */
  tint: string;
}

export const GAMES: GameMeta[] = [
  { id: 'dice', name: 'Dice', path: '/dice', icon: Dice5, blurb: 'Roll over or under your target.', tint: 'from-cyan/30 to-violet/10' },
  { id: 'limbo', name: 'Limbo', path: '/limbo', icon: TrendingUp, blurb: 'Name a multiplier. Beat it.', tint: 'from-violet/40 to-cyan/10' },
  { id: 'mines', name: 'Mines', path: '/mines', icon: Bomb, blurb: 'Clear tiles, dodge the mines.', tint: 'from-win/25 to-cyan/10' },
  { id: 'plinko', name: 'Plinko', path: '/plinko', icon: Triangle, blurb: 'Drop the ball, ride the bounce.', tint: 'from-violet/40 to-loss/10' },
  { id: 'crash', name: 'Crash', path: '/crash', icon: Rocket, blurb: 'Cash out before it blows.', tint: 'from-loss/25 to-violet/20' },
  { id: 'keno', name: 'Keno', path: '/keno', icon: Grid3x3, blurb: 'Pick up to ten. Ten are drawn.', tint: 'from-cyan/25 to-win/10' },
  { id: 'hilo', name: 'HiLo', path: '/hilo', icon: ArrowUpDown, blurb: 'Higher or lower, card by card.', tint: 'from-win/20 to-violet/20' },
  { id: 'blackjack', name: 'Blackjack', path: '/blackjack', icon: Spade, blurb: 'Beat the dealer to 21.', tint: 'from-cyan/20 to-card' },
  { id: 'ladder', name: 'Coin Ladder', path: '/coin-ladder', icon: Coins, blurb: 'Ten flips to the top. Freeze half on the way.', original: true, tint: 'from-violet/50 to-cyan/20' },
  { id: 'vault', name: 'Vault Cracker', path: '/vault-cracker', icon: KeyRound, blurb: 'Pick three dials. Mind the alarms.', original: true, tint: 'from-violet/50 to-win/15' },
];

export const gameById = (id: GameId) => GAMES.find((g) => g.id === id)!;
