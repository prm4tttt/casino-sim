import { useEffect, useRef, useState } from 'react';
import GameShell from '../components/GameShell';
import { AmountInput, BalanceHint, Field, NumberInput, useCanBet } from '../components/BetControls';
import { gameById } from '../lib/gameList';
import { crashPoint } from '../lib/games/limbo';
import { floor2, fmt, fmtMult, payoutFor } from '../lib/money';
import { roundFloats, useStore, type Round } from '../store/useStore';

/** Multiplier grows as e^(GROWTH * ms): 2× after ~5.8s, 10× after ~19s. */
const GROWTH = 0.00012;
const multAt = (ms: number) => Math.exp(GROWTH * ms);

interface Run {
  round: Round;
  crash: number;
  startedAt: number;
  auto: number;
  cashedAt: number | null;
}

type Phase = 'idle' | 'flying' | 'crashed';

const VW = 640;
const VH = 340;

export default function Crash() {
  const [amount, setAmount] = useState(10);
  const [auto, setAuto] = useState(2);
  const [phase, setPhase] = useState<Phase>('idle');
  const [mult, setMult] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [cashed, setCashed] = useState<number | null>(null);
  const [trail, setTrail] = useState<{ key: number; crash: number }[]>([]);
  const run = useRef<Run | null>(null);
  const raf = useRef(0);
  const canBet = useCanBet(amount);

  const cashOut = (at: number) => {
    const r = run.current;
    if (!r || r.cashedAt !== null) return;
    r.cashedAt = at;
    useStore.getState().settle(r.round, r.round.amount, payoutFor(r.round.amount, at));
    setCashed(at);
  };

  const tick = () => {
    const r = run.current;
    if (!r) return;
    const ms = performance.now() - r.startedAt;
    const m = Math.min(r.crash, multAt(ms));
    if (r.cashedAt === null && r.auto >= 1.01 && r.auto <= r.crash && m >= r.auto) cashOut(r.auto);
    setMult(m);
    setElapsed(ms);
    if (m >= r.crash) {
      if (r.cashedAt === null) useStore.getState().settle(r.round, r.round.amount, 0);
      setTrail((t) => [{ key: r.round.nonce, crash: r.crash }, ...t].slice(0, 12));
      run.current = null;
      setPhase('crashed');
      return;
    }
    raf.current = requestAnimationFrame(tick);
  };

  // Leaving mid-flight cashes out at the current multiplier (or busts if it already crashed).
  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      const r = run.current;
      if (r && r.cashedAt === null) {
        const m = multAt(performance.now() - r.startedAt);
        useStore.getState().settle(r.round, r.round.amount, m < r.crash ? payoutFor(r.round.amount, floor2(m)) : 0);
      }
      run.current = null;
    },
    [],
  );

  const start = async () => {
    const round = useStore.getState().begin('crash', amount);
    if (!round) return;
    setPhase('flying');
    setCashed(null);
    setMult(1);
    setElapsed(0);
    const [f] = await roundFloats(round, 1);
    run.current = { round, crash: crashPoint(f), startedAt: performance.now(), auto, cashedAt: null };
    raf.current = requestAnimationFrame(tick);
  };

  // Curve: time on x, multiplier on y, both axes stretch as the round goes on.
  const tMax = Math.max(6000, elapsed * 1.15);
  const mMax = Math.max(1.8, mult * 1.25);
  const px = (ms: number) => 40 + (ms / tMax) * (VW - 60);
  const py = (m: number) => VH - 30 - ((m - 1) / (mMax - 1)) * (VH - 60);
  const pts: string[] = [];
  for (let i = 0; i <= 48; i++) {
    const ms = (elapsed * i) / 48;
    pts.push(`${px(ms).toFixed(1)},${py(Math.min(mult, multAt(ms))).toFixed(1)}`);
  }
  const crashedNow = phase === 'crashed';
  const stroke = crashedNow ? '#FF3B5C' : '#00F0FF';
  const flyingUncashed = phase === 'flying' && cashed === null;
  const ticks = [1, 1 + (mMax - 1) / 3, 1 + ((mMax - 1) * 2) / 3, mMax];

  return (
    <GameShell
      game={gameById('crash')}
      controls={
        <>
          <AmountInput amount={amount} setAmount={setAmount} disabled={phase === 'flying'} />
          <Field label="Auto cash out" hint="0 = off">
            <NumberInput value={auto} onChange={setAuto} min={0} suffix="×" disabled={phase === 'flying'} />
          </Field>
          {flyingUncashed ? (
            <button className="btn-win w-full !py-3.5 !text-base" onClick={() => cashOut(floor2(mult))} disabled={mult < 1.01} data-testid="cashout">
              Cash out {fmt(payoutFor(amount, floor2(mult)))}
            </button>
          ) : (
            <button className="btn-primary w-full !py-3.5 !text-base" disabled={!canBet || phase === 'flying'} onClick={start} data-testid="bet">
              {phase === 'flying' ? 'Waiting for crash…' : 'Bet'}
            </button>
          )}
          <BalanceHint amount={amount} />
          {auto > 0 && auto < 1.01 && <p className="text-xs text-loss">Auto cash out must be 1.01× or higher.</p>}
        </>
      }
    >
      <div className="flex min-h-[28px] flex-wrap justify-end gap-1.5">
        {trail.map((t) => (
          <span key={t.key} className={`chip font-mono ${t.crash >= 2 ? 'bg-win/15 text-win' : 'bg-raised text-muted'}`}>{fmtMult(t.crash)}</span>
        ))}
      </div>
      <div className="relative flex flex-1 items-center justify-center">
        <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full max-w-3xl" role="img" aria-label="Crash multiplier chart">
          <defs>
            <linearGradient id="crashFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={stroke} stopOpacity="0.28" />
              <stop offset="1" stopColor={stroke} stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((m, i) => (
            <g key={i}>
              <line x1={40} x2={VW - 20} y1={py(m)} y2={py(m)} stroke="#262E3A" strokeDasharray="3 5" />
              <text x={34} y={py(m)} textAnchor="end" dominantBaseline="central" fontSize="11" fill="#8B95A5" fontFamily="JetBrains Mono, monospace">{m.toFixed(1)}×</text>
            </g>
          ))}
          {phase !== 'idle' && (
            <>
              <polygon points={`${px(0)},${py(1)} ${pts.join(' ')} ${px(elapsed)},${py(1)}`} fill="url(#crashFill)" />
              <polyline points={pts.join(' ')} fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={px(elapsed)} cy={py(mult)} r="7" fill={stroke} style={{ filter: `drop-shadow(0 0 8px ${stroke})` }} />
            </>
          )}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className={`font-mono text-6xl font-bold sm:text-7xl ${crashedNow ? 'text-loss' : cashed ? 'text-win' : phase === 'idle' ? 'text-muted/40' : 'text-slate-100'}`} data-testid="crash-mult">
            {mult.toFixed(2)}×
          </div>
          <div className="mt-2 h-6 text-sm font-bold" data-testid="crash-status">
            {cashed !== null && <span className="text-win">Cashed out at {fmtMult(cashed)} · +{fmt(payoutFor(amount, cashed) - amount)}</span>}
            {cashed === null && crashedNow && <span className="text-loss">Crashed</span>}
          </div>
        </div>
      </div>
    </GameShell>
  );
}
