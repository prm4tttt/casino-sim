import { useCallback, useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import GameShell from '../components/GameShell';
import InstantControls from '../components/InstantControls';
import { Field, NumberInput } from '../components/BetControls';
import { gameById } from '../lib/gameList';
import { DICE_MAX_CHANCE, DICE_MIN_CHANCE, diceChance, diceMultiplier, diceRoll, diceWins } from '../lib/games/dice';
import { payoutFor } from '../lib/money';
import { roundFloats, useStore } from '../store/useStore';

const clampChance = (c: number) => Math.min(DICE_MAX_CHANCE, Math.max(DICE_MIN_CHANCE, Math.round(c * 100) / 100));

export default function Dice() {
  const [chance, setChance] = useState(49.5);
  const [over, setOver] = useState(true);
  const [last, setLast] = useState<{ roll: number; win: boolean; key: number } | null>(null);
  const [trail, setTrail] = useState<{ roll: number; win: boolean; key: number }[]>([]);

  const target = over ? 100 - chance : chance;
  const multiplier = diceMultiplier(chance);

  const play = useCallback(
    async (amount: number) => {
      const { begin, settle } = useStore.getState();
      const round = begin('dice', amount);
      if (!round) return null;
      const [f] = await roundFloats(round, 1);
      const roll = diceRoll(f);
      const win = diceWins(roll, target, over);
      const payout = win ? payoutFor(amount, multiplier) : 0;
      settle(round, amount, payout);
      const entry = { roll, win, key: round.nonce };
      setLast(entry);
      setTrail((t) => [entry, ...t].slice(0, 12));
      return payout;
    },
    [target, over, multiplier],
  );

  const winFrom = over ? target : 0;
  const winTo = over ? 100 : target;

  return (
    <GameShell
      game={gameById('dice')}
      controls={
        <InstantControls play={play} label="Roll">
          {(locked) => (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Multiplier">
                <NumberInput value={multiplier} disabled={locked} min={1.0102} max={99} suffix="×" onChange={(m) => m > 1 && setChance(clampChance(99 / m))} />
              </Field>
              <Field label="Win chance">
                <NumberInput value={chance} disabled={locked} min={DICE_MIN_CHANCE} max={DICE_MAX_CHANCE} suffix="%" onChange={(c) => c > 0 && setChance(clampChance(c))} />
              </Field>
            </div>
          )}
        </InstantControls>
      }
    >
      <div className="flex min-h-[28px] flex-wrap justify-end gap-1.5">
        {trail.map((t) => (
          <span key={t.key} className={`chip font-mono ${t.win ? 'bg-win/15 text-win' : 'bg-raised text-muted'}`}>{t.roll.toFixed(2)}</span>
        ))}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-10 py-6">
        <div
          key={last?.key ?? 'idle'}
          data-testid="dice-roll"
          className={`animate-pop font-mono text-6xl font-bold sm:text-7xl ${last ? (last.win ? 'text-win' : 'text-loss') : 'text-muted/40'}`}
        >
          {last ? last.roll.toFixed(2) : '00.00'}
        </div>

        <div className="w-full max-w-xl">
          <div className="relative h-3 rounded-full bg-loss/50">
            <div className="absolute inset-y-0 rounded-full bg-win" style={{ left: `${winFrom}%`, width: `${winTo - winFrom}%` }} />
            {last && (
              <div className="absolute -top-9 -translate-x-1/2 transition-all duration-300" style={{ left: `${last.roll}%` }}>
                <div className={`rounded-md px-1.5 py-0.5 font-mono text-xs font-bold text-bg ${last.win ? 'bg-win' : 'bg-loss'}`}>{last.roll.toFixed(2)}</div>
                <div className={`mx-auto h-2 w-0.5 ${last.win ? 'bg-win' : 'bg-loss'}`} />
              </div>
            )}
            <input
              type="range"
              aria-label="Target"
              className="absolute inset-x-0 -top-2"
              min={over ? 100 - DICE_MAX_CHANCE : DICE_MIN_CHANCE}
              max={over ? 100 - DICE_MIN_CHANCE : DICE_MAX_CHANCE}
              step={0.5}
              value={target}
              onChange={(e) => setChance(clampChance(over ? 100 - Number(e.target.value) : Number(e.target.value)))}
            />
          </div>
          <div className="mt-3 flex justify-between font-mono text-xs text-muted">
            {[0, 25, 50, 75, 100].map((n) => <span key={n}>{n}</span>)}
          </div>
        </div>

        <button className="btn-ghost" onClick={() => setOver((o) => !o)}>
          <ArrowLeftRight size={16} />
          Roll {over ? 'over' : 'under'} <span className="font-mono text-cyan">{target.toFixed(2)}</span>
        </button>
      </div>
      <p className="text-center text-xs text-muted">
        Win chance {diceChance(target, over).toFixed(2)}% · pays {multiplier.toFixed(4)}×
      </p>
    </GameShell>
  );
}
