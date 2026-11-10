import { useCallback, useState } from 'react';
import GameShell from '../components/GameShell';
import InstantControls from '../components/InstantControls';
import { Field, Segmented } from '../components/BetControls';
import { gameById } from '../lib/gameList';
import { KENO_MAX_PICKS, KENO_NUMBERS, kenoDraw, kenoHitProb, kenoTable } from '../lib/games/keno';
import type { Risk } from '../lib/games/plinko';
import { fmt, payoutFor } from '../lib/money';
import { roundFloats, useStore } from '../store/useStore';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const short = (m: number) => (m >= 1000 ? `${+(m / 1000).toFixed(1)}k` : String(+m.toFixed(2)));

export default function Keno() {
  const [picks, setPicks] = useState<number[]>([]);
  const [risk, setRisk] = useState<Risk>('medium');
  const [drawn, setDrawn] = useState<number[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [result, setResult] = useState<{ hits: number; net: number } | null>(null);

  const table = picks.length ? kenoTable(picks.length, risk) : [];
  const hitsSoFar = drawn.filter((n) => picks.includes(n)).length;

  const toggle = (n: number) => {
    if (drawing) return;
    setDrawn([]);
    setResult(null);
    setPicks((p) => (p.includes(n) ? p.filter((x) => x !== n) : p.length < KENO_MAX_PICKS ? [...p, n] : p));
  };

  const autoPick = () => {
    const pool = Array.from({ length: KENO_NUMBERS }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setDrawn([]);
    setResult(null);
    setPicks(pool.slice(0, KENO_MAX_PICKS));
  };

  const play = useCallback(
    async (amount: number) => {
      if (picks.length === 0) return null;
      const round = useStore.getState().begin('keno', amount);
      if (!round) return null;
      setDrawing(true);
      setResult(null);
      setDrawn([]);
      const numbers = kenoDraw(await roundFloats(round, 10));
      const hits = numbers.filter((n) => picks.includes(n)).length;
      const payout = payoutFor(amount, kenoTable(picks.length, risk)[hits]);
      for (let i = 1; i <= numbers.length; i++) {
        await sleep(70);
        setDrawn(numbers.slice(0, i));
      }
      useStore.getState().settle(round, amount, payout);
      setResult({ hits, net: payout - amount });
      setDrawing(false);
      return payout;
    },
    [picks, risk],
  );

  return (
    <GameShell
      game={gameById('keno')}
      controls={
        <InstantControls play={play} extraDisabled={picks.length === 0 || drawing} delay={400}>
          {(locked) => (
            <>
              <Field label="Risk">
                <Segmented value={risk} onChange={setRisk} disabled={locked || drawing} options={(['low', 'medium', 'high'] as Risk[]).map((r) => ({ value: r, label: r }))} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <button className="btn-ghost" disabled={locked || drawing} onClick={autoPick} data-testid="keno-auto">Auto pick</button>
                <button className="btn-ghost" disabled={locked || drawing || picks.length === 0} onClick={() => { setPicks([]); setDrawn([]); setResult(null); }}>Clear</button>
              </div>
              {picks.length === 0 && <p className="text-xs text-muted">Pick 1 to 10 numbers to play.</p>}
            </>
          )}
        </InstantControls>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <div className="h-6 text-sm font-bold" data-testid="keno-status">
          {result ? (
            <span className={result.net > 0 ? 'text-win' : 'text-muted'}>
              {result.hits} of {picks.length} hit · {result.net > 0 ? '+' : ''}{fmt(result.net)}
            </span>
          ) : (
            <span className="text-muted">{picks.length}/{KENO_MAX_PICKS} picked</span>
          )}
        </div>
        <div className="grid w-full max-w-xl grid-cols-8 gap-1.5 sm:gap-2">
          {Array.from({ length: KENO_NUMBERS }, (_, i) => i + 1).map((n) => {
            const picked = picks.includes(n);
            const isDrawn = drawn.includes(n);
            const cls = picked && isDrawn
              ? 'animate-pop border-win bg-win text-bg shadow-glow-win'
              : isDrawn
                ? 'animate-pop border-loss/50 bg-loss/15 text-loss'
                : picked
                  ? 'border-violet bg-violet/60 text-white'
                  : 'border-line bg-raised text-slate-300 hover:border-cyan/60';
            return (
              <button key={n} data-testid={`keno-${n}`} onClick={() => toggle(n)} disabled={drawing} aria-pressed={picked}
                className={`grid aspect-square place-items-center rounded-lg border font-mono text-sm font-bold transition sm:text-base ${cls}`}>
                {n}
              </button>
            );
          })}
        </div>
        {picks.length > 0 && (
          <div className="flex w-full max-w-xl gap-1 overflow-x-auto pb-1">
            {table.map((m, h) => (
              <div key={h} className={`min-w-[52px] flex-1 rounded-lg border px-1 py-1.5 text-center transition ${
                (result ? result.hits === h : drawing && hitsSoFar === h) ? 'border-cyan bg-cyan/10' : 'border-line bg-raised'}`}
                title={`Chance ${(kenoHitProb(picks.length, h) * 100).toFixed(2)}%`}>
                <div className={`font-mono text-xs font-bold ${m > 0 ? 'text-slate-100' : 'text-muted/60'}`}>{short(m)}×</div>
                <div className="text-[10px] text-muted">{h} hit{h === 1 ? '' : 's'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </GameShell>
  );
}
