import { useEffect, useRef, useState } from 'react';
import { Snowflake } from 'lucide-react';
import GameShell from '../components/GameShell';
import { AmountInput, BalanceHint, useCanBet } from '../components/BetControls';
import { gameById } from '../lib/gameList';
import { LADDER_STEPS, flip, ladderMultiplier, type Side } from '../lib/games/ladder';
import { fmt, fmtMult, payoutFor, round2 } from '../lib/money';
import { roundFloats, useStore, type Round } from '../store/useStore';

interface Game {
  round: Round;
  floats: number[];
  step: number;
  /** Stake still riding. Halves when you freeze. */
  riding: number;
  /** Already paid out by a freeze. */
  banked: number;
  frozenAt: number | null;
  last: { side: Side; hit: boolean } | null;
  done: boolean;
  bust: boolean;
  payout: number;
}

export default function CoinLadder() {
  const [amount, setAmount] = useState(10);
  const [game, setGame] = useState<Game | null>(null);
  const live = useRef<Game | null>(null);
  live.current = game;
  const canBet = useCanBet(amount);
  const playing = !!game && !game.done;

  const value = (g: Game) => payoutFor(g.riding, ladderMultiplier(g.step));

  const finish = (g: Game, bust: boolean): Game => {
    const final = bust ? 0 : value(g);
    const payout = round2(g.banked + final);
    // Banked winnings were credited at freeze time; only the rest is paid now.
    useStore.getState().settle(g.round, g.round.amount, payout, final);
    return { ...g, done: true, bust, payout };
  };

  useEffect(
    () => () => {
      const g = live.current;
      if (g && !g.done) finish(g, false);
    },
    [],
  );

  const start = async () => {
    const round = useStore.getState().begin('ladder', amount);
    if (!round) return;
    const floats = await roundFloats(round, LADDER_STEPS);
    setGame({ round, floats, step: 0, riding: round.amount, banked: 0, frozenAt: null, last: null, done: false, bust: false, payout: 0 });
  };

  const call = (side: Side) => {
    if (!game || game.done) return;
    const landed = flip(game.floats[game.step]);
    const hit = landed === side;
    const next = { ...game, last: { side: landed, hit }, step: hit ? game.step + 1 : game.step };
    if (!hit) return setGame(finish(next, true));
    setGame(next.step === LADDER_STEPS ? finish(next, false) : next);
  };

  const freeze = () => {
    if (!game || game.done || game.frozenAt !== null || game.step === 0) return;
    const half = round2(game.riding / 2);
    const banked = payoutFor(half, ladderMultiplier(game.step));
    useStore.getState().credit(banked);
    setGame({ ...game, riding: round2(game.riding - half), banked, frozenAt: game.step });
  };

  const step = game?.step ?? 0;

  return (
    <GameShell
      game={gameById('ladder')}
      controls={
        <>
          <AmountInput amount={amount} setAmount={setAmount} disabled={playing} />
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-ghost !py-4 !text-base" disabled={!playing} onClick={() => call('heads')} data-testid="ladder-heads">Heads</button>
            <button className="btn-ghost !py-4 !text-base" disabled={!playing} onClick={() => call('tails')} data-testid="ladder-tails">Tails</button>
          </div>
          <button className="btn w-full bg-violet/30 text-violet-100 hover:bg-violet/50" disabled={!playing || step === 0 || game!.frozenAt !== null} onClick={freeze} data-testid="ladder-freeze">
            <Snowflake size={16} />
            {game?.frozenAt != null ? `Froze ${fmt(game.banked)} at rung ${game.frozenAt}` : playing && step > 0 ? `Freeze half (bank ${fmt(payoutFor(round2(game!.riding / 2), ladderMultiplier(step)))})` : 'Freeze half'}
          </button>
          {playing ? (
            <button className="btn-win w-full !py-3.5 !text-base" disabled={step === 0} onClick={() => setGame(finish(game!, false))} data-testid="cashout">
              Cash out {fmt(value(game!))}
            </button>
          ) : (
            <>
              <button className="btn-primary w-full !py-3.5 !text-base" disabled={!canBet} onClick={start} data-testid="bet">Bet</button>
              <BalanceHint amount={amount} />
            </>
          )}
          <p className="text-xs leading-relaxed text-muted">
            Call each flip to climb a rung. Once per climb you can freeze: half your stake is paid out at the
            current rung and is safe, the other half keeps climbing.
          </p>
        </>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-5 sm:flex-row sm:gap-10">
        <div className="flex flex-col items-center gap-3">
          <div
            key={game ? `${game.round.nonce}-${game.step}-${game.done}` : 'idle'}
            className={`animate-flip grid h-32 w-32 place-items-center rounded-full border-4 text-xl font-extrabold uppercase ${
              game?.last ? (game.last.hit ? 'border-win bg-win/15 text-win' : 'border-loss bg-loss/15 text-loss') : 'border-line bg-raised text-muted'
            }`}
          >
            {game?.last ? game.last.side : '?'}
          </div>
          <div className="h-6 text-center text-sm font-bold" data-testid="ladder-status">
            {game?.done ? (
              game.bust ? (
                <span className="text-loss">Wrong call{game.banked > 0 ? ` · kept ${fmt(game.banked)} frozen` : ''}</span>
              ) : (
                <span className="text-win">Paid {fmt(game.payout)} · {game.payout >= game.round.amount ? '+' : ''}{fmt(game.payout - game.round.amount)}</span>
              )
            ) : playing ? (
              <span className="text-muted">Rung {step} of {LADDER_STEPS}</span>
            ) : (
              <span className="text-muted">Place a bet to start climbing</span>
            )}
          </div>
        </div>

        <ol className="flex w-full max-w-[220px] flex-col-reverse gap-1.5">
          {Array.from({ length: LADDER_STEPS }, (_, i) => i + 1).map((n) => {
            const reached = step >= n;
            const nextUp = playing && step + 1 === n;
            return (
              <li key={n} className={`flex items-center justify-between rounded-lg border px-3 py-1.5 font-mono text-sm font-bold transition ${
                reached ? 'border-win/50 bg-win/15 text-win' : nextUp ? 'border-cyan bg-cyan/10 text-cyan' : 'border-line bg-raised text-muted'}`}>
                <span className="flex items-center gap-1.5 text-xs">
                  {n}
                  {game?.frozenAt === n && <Snowflake size={12} className="text-violet-300" />}
                </span>
                <span>{fmtMult(ladderMultiplier(n))}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </GameShell>
  );
}
