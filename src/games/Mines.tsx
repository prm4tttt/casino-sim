import { useEffect, useRef, useState } from 'react';
import { Bomb, Gem } from 'lucide-react';
import GameShell from '../components/GameShell';
import { AmountInput, BalanceHint, Field, NumberInput, useCanBet } from '../components/BetControls';
import { gameById } from '../lib/gameList';
import { MINES_TILES, minePositions, minesMultiplier } from '../lib/games/mines';
import { fmt, fmtMult, payoutFor } from '../lib/money';
import { roundFloats, useStore, type Round } from '../store/useStore';

interface Game {
  round: Round;
  mines: number;
  bombs: Set<number>;
  revealed: Set<number>;
  /** Tile that ended the game, if a mine was hit. */
  boom: number | null;
  done: boolean;
  payout: number;
}

export default function Mines() {
  const [amount, setAmount] = useState(10);
  const [mines, setMines] = useState(3);
  const [game, setGame] = useState<Game | null>(null);
  const [starting, setStarting] = useState(false);
  const live = useRef<Game | null>(null);
  live.current = game;
  const canBet = useCanBet(amount);
  const playing = !!game && !game.done;

  const finish = (g: Game, boom: number | null) => {
    const mult = boom === null ? minesMultiplier(g.mines, g.revealed.size) : 0;
    const payout = payoutFor(g.round.amount, mult);
    useStore.getState().settle(g.round, g.round.amount, payout);
    return { ...g, boom, done: true, payout };
  };

  // Leaving mid-game cashes out whatever has been earned so far.
  useEffect(
    () => () => {
      const g = live.current;
      if (g && !g.done) finish(g, null);
    },
    [],
  );

  const start = async () => {
    setStarting(true);
    const round = useStore.getState().begin('mines', amount);
    if (round) {
      const floats = await roundFloats(round, MINES_TILES - 1);
      setGame({ round, mines, bombs: new Set(minePositions(floats, mines)), revealed: new Set(), boom: null, done: false, payout: 0 });
    }
    setStarting(false);
  };

  const pick = (i: number) => {
    if (!game || game.done || game.revealed.has(i)) return;
    if (game.bombs.has(i)) return setGame(finish(game, i));
    const next = { ...game, revealed: new Set(game.revealed).add(i) };
    setGame(next.revealed.size === MINES_TILES - game.mines ? finish(next, null) : next);
  };

  const pickRandom = () => {
    if (!game) return;
    const open = Array.from({ length: MINES_TILES }, (_, i) => i).filter((i) => !game.revealed.has(i));
    pick(open[Math.floor(Math.random() * open.length)]);
  };

  const gems = game?.revealed.size ?? 0;
  const current = game ? minesMultiplier(game.mines, gems) : 1;
  const next = minesMultiplier(game?.mines ?? mines, gems + 1);

  return (
    <GameShell
      game={gameById('mines')}
      controls={
        <>
          <AmountInput amount={amount} setAmount={setAmount} disabled={playing} />
          <Field label="Mines" hint={`${MINES_TILES - mines} safe tiles`}>
            <NumberInput value={mines} onChange={(v) => setMines(Math.min(24, Math.max(1, Math.floor(v) || 1)))} min={1} max={24} step={1} disabled={playing} />
          </Field>
          {playing ? (
            <>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg bg-well p-2"><div className="label">Now</div><div className="font-mono font-bold text-win">{fmtMult(current)}</div></div>
                <div className="rounded-lg bg-well p-2"><div className="label">Next tile</div><div className="font-mono font-bold">{fmtMult(next)}</div></div>
              </div>
              <button className="btn-ghost w-full" onClick={pickRandom}>Pick a random tile</button>
              <button className="btn-win w-full !py-3.5 !text-base" disabled={gems === 0} onClick={() => setGame(finish(game!, null))} data-testid="cashout">
                Cash out {fmt(payoutFor(game!.round.amount, current))}
              </button>
            </>
          ) : (
            <>
              <button className="btn-primary w-full !py-3.5 !text-base" disabled={!canBet || starting} onClick={start} data-testid="bet">Bet</button>
              <BalanceHint amount={amount} />
            </>
          )}
        </>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <div className="h-7 text-center text-sm font-bold" data-testid="mines-status">
          {game?.done &&
            (game.boom !== null ? (
              <span className="text-loss">Boom. You hit a mine.</span>
            ) : (
              <span className="text-win">Cashed out {fmtMult(current)} · +{fmt(game.payout - game.round.amount)}</span>
            ))}
          {playing && <span className="text-muted">{gems} found · {MINES_TILES - game!.mines - gems} safe tiles left</span>}
        </div>
        <div className="grid w-full max-w-md grid-cols-5 gap-2 sm:gap-3">
          {Array.from({ length: MINES_TILES }, (_, i) => {
            const open = game?.revealed.has(i);
            const isBomb = game?.bombs.has(i);
            const shown = open || game?.done;
            const dim = game?.done && !open && game.boom !== i;
            return (
              <button
                key={i}
                data-testid={`tile-${i}`}
                disabled={!playing || open}
                onClick={() => pick(i)}
                aria-label={`Tile ${i + 1}`}
                className={`grid aspect-square place-items-center rounded-xl border transition ${
                  !shown
                    ? `border-line bg-raised ${playing ? 'hover:-translate-y-0.5 hover:border-cyan/60 hover:bg-line' : 'opacity-70'}`
                    : isBomb
                      ? `border-loss/40 bg-loss/15 ${game?.boom === i ? 'animate-shake !bg-loss/40' : ''}`
                      : 'border-win/30 bg-win/10'
                } ${dim ? 'opacity-40' : ''}`}
              >
                {shown &&
                  (isBomb ? <Bomb className="animate-pop text-loss" size={28} /> : <Gem className="animate-pop text-win" size={28} />)}
              </button>
            );
          })}
        </div>
      </div>
    </GameShell>
  );
}
