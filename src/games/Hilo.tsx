import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, SkipForward } from 'lucide-react';
import GameShell from '../components/GameShell';
import PlayingCard from '../components/PlayingCard';
import { AmountInput, BalanceHint, useCanBet } from '../components/BetControls';
import { gameById } from '../lib/gameList';
import { cardFromFloat, type Card } from '../lib/games/cards';
import { hiloMultiplier, hiloOptions, hiloWins, type HiloChoice } from '../lib/games/hilo';
import { fmt, fmtMult, payoutFor } from '../lib/money';
import { roundFloats, useStore, type Round } from '../store/useStore';

const DECK = 64;

interface Step { card: Card; mark: 'start' | 'win' | 'loss' | 'skip' }
interface Game {
  round: Round;
  floats: number[];
  idx: number;
  steps: Step[];
  odds: number;
  guesses: number;
  done: boolean;
  lost: boolean;
  payout: number;
}

export default function Hilo() {
  const [amount, setAmount] = useState(10);
  const [game, setGame] = useState<Game | null>(null);
  const live = useRef<Game | null>(null);
  live.current = game;
  const canBet = useCanBet(amount);
  const playing = !!game && !game.done;

  const multOf = (g: Game) => (g.guesses === 0 ? 1 : hiloMultiplier(g.odds));

  const finish = (g: Game, lost: boolean): Game => {
    const payout = lost ? 0 : payoutFor(g.round.amount, multOf(g));
    useStore.getState().settle(g.round, g.round.amount, payout);
    return { ...g, done: true, lost, payout };
  };

  useEffect(
    () => () => {
      const g = live.current;
      if (g && !g.done) finish(g, false);
    },
    [],
  );

  const start = async () => {
    const round = useStore.getState().begin('hilo', amount);
    if (!round) return;
    const floats = await roundFloats(round, DECK);
    setGame({ round, floats, idx: 0, steps: [{ card: cardFromFloat(floats[0]), mark: 'start' }], odds: 1, guesses: 0, done: false, lost: false, payout: 0 });
  };

  const current = game ? game.steps[game.steps.length - 1].card : null;
  const options = current ? hiloOptions(current.rank) : null;

  const guess = (choice: HiloChoice) => {
    if (!game || game.done || !current || !options) return;
    const idx = game.idx + 1;
    const card = cardFromFloat(game.floats[idx]);
    const win = hiloWins(choice, current.rank, card.rank);
    const next: Game = {
      ...game,
      idx,
      steps: [...game.steps, { card, mark: win ? 'win' : 'loss' }],
      odds: win ? game.odds / options[choice].prob : game.odds,
      guesses: game.guesses + 1,
    };
    if (!win) return setGame(finish(next, true));
    setGame(idx >= DECK - 1 ? finish(next, false) : next);
  };

  const skip = () => {
    if (!game || game.done) return;
    const idx = game.idx + 1;
    const next = { ...game, idx, steps: [...game.steps, { card: cardFromFloat(game.floats[idx]), mark: 'skip' as const }] };
    setGame(idx >= DECK - 1 ? finish(next, false) : next);
  };

  const mult = game ? multOf(game) : 1;

  const GuessButton = ({ choice, icon: Icon }: { choice: HiloChoice; icon: React.ElementType }) => {
    const o = options?.[choice];
    return (
      <button className="btn-ghost w-full flex-col !items-stretch !gap-1 !py-3" disabled={!playing} onClick={() => guess(choice)} data-testid={`hilo-${choice}`}>
        <span className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2"><Icon size={16} className="text-cyan" /> {o?.label ?? (choice === 'higher' ? 'Higher or same' : 'Lower or same')}</span>
          <span className="font-mono text-muted">{o ? `${(o.prob * 100).toFixed(1)}%` : ''}</span>
        </span>
        {o && game && <span className="text-left font-mono text-xs text-win">→ {fmtMult(hiloMultiplier(game.odds / o.prob))}</span>}
      </button>
    );
  };

  return (
    <GameShell
      game={gameById('hilo')}
      controls={
        <>
          <AmountInput amount={amount} setAmount={setAmount} disabled={playing} />
          <GuessButton choice="higher" icon={ArrowUp} />
          <GuessButton choice="lower" icon={ArrowDown} />
          <button className="btn-ghost w-full" disabled={!playing} onClick={skip}><SkipForward size={16} /> Skip card</button>
          {playing ? (
            <button className="btn-win w-full !py-3.5 !text-base" disabled={game!.guesses === 0} onClick={() => setGame(finish(game!, false))} data-testid="cashout">
              Cash out {fmt(payoutFor(game!.round.amount, mult))}
            </button>
          ) : (
            <>
              <button className="btn-primary w-full !py-3.5 !text-base" disabled={!canBet} onClick={start} data-testid="bet">Bet</button>
              <BalanceHint amount={amount} />
            </>
          )}
        </>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <div className="h-6 text-sm font-bold" data-testid="hilo-status">
          {game?.done ? (
            game.lost ? <span className="text-loss">Wrong call. Round over.</span> : <span className="text-win">Cashed out {fmtMult(mult)} · +{fmt(game.payout - game.round.amount)}</span>
          ) : playing ? (
            <span className="text-muted">Running multiplier <span className="font-mono text-win">{fmtMult(mult)}</span></span>
          ) : (
            <span className="text-muted">Aces are low, kings are high.</span>
          )}
        </div>
        <div key={game ? game.steps.length : 0}>
          <PlayingCard card={current} size="lg" tone={game?.done && game.lost ? 'loss' : undefined} />
        </div>
        <div className="flex h-20 w-full max-w-xl items-end gap-2 overflow-x-auto pb-1">
          {game?.steps.map((s, i) => (
            <div key={i} className="flex shrink-0 flex-col items-center gap-1">
              <PlayingCard card={s.card} size="sm" dim={i < game.steps.length - 1} tone={s.mark === 'win' ? 'win' : s.mark === 'loss' ? 'loss' : undefined} />
              <span className="text-[10px] font-bold uppercase text-muted">{s.mark}</span>
            </div>
          ))}
        </div>
      </div>
    </GameShell>
  );
}
