import { LogoMark } from './Logo';
import { RANKS, SUITS, isRed, type Card } from '../lib/games/cards';

const SIZES = {
  sm: 'h-16 w-11 text-sm rounded-md',
  md: 'h-24 w-[4.25rem] text-xl rounded-lg',
  lg: 'h-40 w-28 text-4xl rounded-xl',
};

export default function PlayingCard({ card, size = 'md', dim, tone }: { card?: Card | null; size?: keyof typeof SIZES; dim?: boolean; tone?: 'win' | 'loss' }) {
  const ring = tone === 'win' ? 'ring-2 ring-win' : tone === 'loss' ? 'ring-2 ring-loss' : '';
  if (!card)
    return (
      <div className={`${SIZES[size]} grid shrink-0 place-items-center border border-violet/60 bg-gradient-to-br from-violet/70 to-bg`} aria-label="Face-down card">
        <LogoMark size={size === 'lg' ? 40 : size === 'md' ? 26 : 18} />
      </div>
    );
  return (
    <div
      className={`${SIZES[size]} ${ring} animate-flip relative flex shrink-0 flex-col justify-between bg-slate-100 p-1.5 font-bold leading-none shadow-lg ${isRed(card) ? 'text-rose-600' : 'text-slate-900'} ${dim ? 'opacity-50' : ''}`}
      aria-label={`${RANKS[card.rank]} ${['spades', 'hearts', 'diamonds', 'clubs'][card.suit]}`}
    >
      <span>{RANKS[card.rank]}</span>
      <span className="self-end text-[1.4em]">{SUITS[card.suit]}</span>
    </div>
  );
}
