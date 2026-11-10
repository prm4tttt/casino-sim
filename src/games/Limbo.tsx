import { useCallback, useState } from 'react';
import GameShell from '../components/GameShell';
import InstantControls from '../components/InstantControls';
import { Field, NumberInput } from '../components/BetControls';
import { gameById } from '../lib/gameList';
import { LIMBO_MAX, limboChance, limboResult } from '../lib/games/limbo';
import { fmtMult, payoutFor } from '../lib/money';
import { roundFloats, useStore } from '../store/useStore';

interface Shot { result: number; win: boolean; key: number }

export default function Limbo() {
  const [target, setTarget] = useState(2);
  const [last, setLast] = useState<Shot | null>(null);
  const [trail, setTrail] = useState<Shot[]>([]);
  const valid = target >= 1.01 && target <= LIMBO_MAX;

  const play = useCallback(
    async (amount: number) => {
      if (!(target >= 1.01)) return null;
      const { begin, settle } = useStore.getState();
      const round = begin('limbo', amount);
      if (!round) return null;
      const [f] = await roundFloats(round, 1);
      const result = limboResult(f);
      const win = result >= target;
      const payout = win ? payoutFor(amount, target) : 0;
      settle(round, amount, payout);
      const shot = { result, win, key: round.nonce };
      setLast(shot);
      setTrail((t) => [shot, ...t].slice(0, 12));
      return payout;
    },
    [target],
  );

  return (
    <GameShell
      game={gameById('limbo')}
      controls={
        <InstantControls play={play} extraDisabled={!valid}>
          {(locked) => (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Target">
                <NumberInput value={target} onChange={setTarget} disabled={locked} min={1.01} max={LIMBO_MAX} suffix="×" />
              </Field>
              <Field label="Win chance">
                <div className="input text-muted">{valid ? limboChance(target).toFixed(4) : '—'}%</div>
              </Field>
            </div>
          )}
        </InstantControls>
      }
    >
      <div className="flex min-h-[28px] flex-wrap justify-end gap-1.5">
        {trail.map((t) => (
          <span key={t.key} className={`chip font-mono ${t.win ? 'bg-win/15 text-win' : 'bg-raised text-muted'}`}>{fmtMult(t.result)}</span>
        ))}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <div
          key={last?.key ?? 'idle'}
          data-testid="limbo-result"
          className={`animate-pop font-mono text-6xl font-bold sm:text-8xl ${last ? (last.win ? 'text-win' : 'text-loss') : 'text-muted/40'}`}
        >
          {fmtMult(last?.result ?? 1)}
        </div>
        <p className="text-sm text-muted">
          {last ? (last.win ? `Cleared your ${fmtMult(target)} target` : `Fell short of ${fmtMult(target)}`) : `Land at or above ${valid ? fmtMult(target) : 'your target'} to win`}
        </p>
      </div>
    </GameShell>
  );
}
