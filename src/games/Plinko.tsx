import { useCallback, useEffect, useRef, useState } from 'react';
import GameShell from '../components/GameShell';
import InstantControls from '../components/InstantControls';
import { Field, Segmented } from '../components/BetControls';
import { gameById } from '../lib/gameList';
import { PLINKO_ROWS, plinkoBucket, plinkoPath, plinkoTable, type Risk } from '../lib/games/plinko';
import { payoutFor } from '../lib/money';
import { roundFloats, useStore } from '../store/useStore';

const W = 600;
const STEP_MS = 120;
const DROP_MS = 180;

function geometry(rows: number) {
  const dx = W / (rows + 3);
  const dy = dx * 0.88;
  const top = dx * 1.2;
  const pegR = Math.max(2.5, dx * 0.11);
  const ballR = dx * 0.24;
  const bucketY = top + rows * dy;
  return { dx, dy, top, pegR, ballR, bucketY, height: bucketY + dx * 0.9 };
}

interface BallSpec { id: number; path: number[]; rows: number }

function Ball({ spec, onDone }: { spec: BallSpec; onDone: (id: number) => void }) {
  const ref = useRef<SVGCircleElement>(null);
  useEffect(() => {
    const g = geometry(spec.rows);
    const pts: [number, number][] = [[W / 2, g.top - g.pegR - g.ballR]];
    let rights = 0;
    spec.path.forEach((d, k) => {
      rights += d;
      const x = W / 2 + (rights - (k + 1) / 2) * g.dx;
      const y = k + 1 < spec.rows ? g.top + (k + 1) * g.dy - g.pegR - g.ballR : g.bucketY + g.dx * 0.1;
      pts.push([x, y]);
    });
    const total = DROP_MS + spec.rows * STEP_MS;
    const t0 = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const t = now - t0;
      const el = ref.current;
      if (!el) return;
      if (t >= total) return onDone(spec.id);
      let x: number, y: number;
      if (t < DROP_MS) {
        const u = t / DROP_MS;
        x = pts[0][0];
        y = pts[0][1] - g.dy * (1 - u * u);
      } else {
        const s = Math.min(spec.rows - 1, Math.floor((t - DROP_MS) / STEP_MS));
        const u = (t - DROP_MS - s * STEP_MS) / STEP_MS;
        const [ax, ay] = pts[s];
        const [bx, by] = pts[s + 1];
        x = ax + (bx - ax) * u;
        y = ay + (by - ay) * u * u - g.dy * 0.45 * 4 * u * (1 - u) * (1 - u);
      }
      el.setAttribute('cx', x.toFixed(1));
      el.setAttribute('cy', y.toFixed(1));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [spec, onDone]);
  const g = geometry(spec.rows);
  return <circle ref={ref} cx={W / 2} cy={-20} r={g.ballR} fill="#00F0FF" style={{ filter: 'drop-shadow(0 0 6px rgba(0,240,255,.8))' }} />;
}

function bucketColor(k: number, rows: number): string {
  const d = Math.abs(k - rows / 2) / (rows / 2);
  // Violet in the middle, through cyan, to mint at the edges.
  const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const violet = [112, 0, 255], cyan = [0, 240, 255], mint = [0, 255, 135];
  const c = d < 0.5 ? mix(violet, cyan, d * 2) : mix(cyan, mint, (d - 0.5) * 2);
  return `rgb(${c.join(',')})`;
}

const short = (m: number) => (m >= 1000 ? `${+(m / 1000).toFixed(1)}k` : m >= 100 ? m.toFixed(0) : String(+m.toFixed(2)));

export default function Plinko() {
  const [rows, setRows] = useState(12);
  const [risk, setRisk] = useState<Risk>('medium');
  const [balls, setBalls] = useState<BallSpec[]>([]);
  const [hits, setHits] = useState<{ id: number; bucket: number; mult: number }[]>([]);
  const [bump, setBump] = useState<{ bucket: number; id: number } | null>(null);
  const table = plinkoTable(rows, risk);
  const g = geometry(rows);
  const flying = balls.length > 0;
  const pending = useRef(new Map<number, { bucket: number; mult: number }>());

  const play = useCallback(
    async (amount: number) => {
      const store = useStore.getState();
      const round = store.begin('plinko', amount);
      if (!round) return null;
      const path = plinkoPath(await roundFloats(round, rows), rows);
      const bucket = plinkoBucket(path);
      const mult = plinkoTable(rows, risk)[bucket];
      const payout = payoutFor(amount, mult);
      // The stake is already taken; winnings land when the ball does.
      setTimeout(() => useStore.getState().settle(round, amount, payout), DROP_MS + rows * STEP_MS);
      pending.current.set(round.nonce, { bucket, mult });
      setBalls((b) => [...b, { id: round.nonce, path, rows }]);
      return payout;
    },
    [rows, risk],
  );

  const onDone = useCallback((id: number) => {
    const res = pending.current.get(id);
    pending.current.delete(id);
    setBalls((b) => b.filter((x) => x.id !== id));
    if (res) {
      setHits((h) => [{ id, ...res }, ...h].slice(0, 6));
      setBump({ bucket: res.bucket, id });
    }
  }, []);

  return (
    <GameShell
      game={gameById('plinko')}
      controls={
        <InstantControls play={play} label="Drop ball" delay={250}>
          {(locked) => (
            <>
              <Field label="Risk">
                <Segmented value={risk} onChange={setRisk} disabled={locked || flying} options={(['low', 'medium', 'high'] as Risk[]).map((r) => ({ value: r, label: r }))} />
              </Field>
              <Field label="Rows">
                <select className="input" value={rows} disabled={locked || flying} onChange={(e) => setRows(Number(e.target.value))}>
                  {PLINKO_ROWS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
            </>
          )}
        </InstantControls>
      }
    >
      <div className="relative flex flex-1 items-center justify-center">
        <div className="absolute right-0 top-0 flex flex-col gap-1.5">
          {hits.map((h) => (
            <span key={h.id} className="chip animate-pop justify-center font-mono" style={{ background: bucketColor(h.bucket, rows), color: Math.abs(h.bucket - rows / 2) / (rows / 2) < 0.3 ? '#FFFFFF' : '#0B0E14' }} data-testid="plinko-hit">
              {short(h.mult)}×
            </span>
          ))}
        </div>
        <svg viewBox={`0 0 ${W} ${g.height}`} className="w-full max-w-2xl" role="img" aria-label="Plinko board">
          {Array.from({ length: rows }, (_, r) =>
            Array.from({ length: r + 3 }, (_, i) => (
              <circle key={`${r}-${i}`} cx={W / 2 + (i - (r + 2) / 2) * g.dx} cy={g.top + r * g.dy} r={g.pegR} fill="#5B6676" />
            )),
          )}
          {table.map((m, k) => {
            const x = W / 2 + (k - rows / 2) * g.dx;
            const w = g.dx * 0.9;
            const h = g.dx * 0.62;
            const active = bump?.bucket === k;
            return (
              <g key={`${k}-${active ? bump!.id : 'x'}`} className={active ? 'animate-pop' : ''} style={{ transformOrigin: `${x}px ${g.bucketY + h}px` }}>
                <rect x={x - w / 2} y={g.bucketY + g.dx * 0.2} width={w} height={h} rx={w * 0.14} fill={bucketColor(k, rows)} opacity={active ? 1 : 0.85} />
                <text x={x} y={g.bucketY + g.dx * 0.2 + h / 2} textAnchor="middle" dominantBaseline="central" fontSize={g.dx * 0.3} fontWeight={800} fill={Math.abs(k - rows / 2) / (rows / 2) < 0.3 ? '#FFFFFF' : '#0B0E14'} fontFamily="JetBrains Mono, monospace">
                  {short(m)}
                </text>
              </g>
            );
          })}
          {balls.map((b) => <Ball key={b.id} spec={b} onDone={onDone} />)}
        </svg>
      </div>
    </GameShell>
  );
}
