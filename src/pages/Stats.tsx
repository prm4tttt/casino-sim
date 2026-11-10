import RecentBets from '../components/RecentBets';
import { fmt } from '../lib/money';
import { useStore } from '../store/useStore';

function ProfitChart({ series }: { series: number[] }) {
  const w = 800;
  const h = 220;
  const pad = 8;
  const min = Math.min(0, ...series);
  const max = Math.max(0, ...series);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / Math.max(1, series.length - 1)) * (w - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * (h - pad * 2);
  const line = series.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const up = series[series.length - 1] >= 0;
  const color = up ? '#00FF87' : '#FF3B5C';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-56 w-full" preserveAspectRatio="none" role="img" aria-label="Profit over recent bets">
      <defs>
        <linearGradient id="pf" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.3" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={pad} x2={w - pad} y1={y(0)} y2={y(0)} stroke="#262E3A" strokeDasharray="4 4" />
      {series.length > 1 && (
        <>
          <path d={`${line} L${x(series.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill="url(#pf)" />
          <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </>
      )}
    </svg>
  );
}

export default function Stats() {
  const stats = useStore((s) => s.stats);
  const resetStats = useStore((s) => s.resetStats);
  const total = stats.wins + stats.losses;
  const tiles = [
    { label: 'Wagered', value: fmt(stats.wagered) },
    { label: 'Profit', value: `${stats.profit > 0 ? '+' : ''}${fmt(stats.profit)}`, tone: stats.profit > 0 ? 'text-win' : stats.profit < 0 ? 'text-loss' : '' },
    { label: 'Wins', value: String(stats.wins), tone: 'text-win' },
    { label: 'Losses', value: String(stats.losses), tone: 'text-loss' },
    { label: 'Win rate', value: total ? `${((stats.wins / total) * 100).toFixed(1)}%` : '—' },
  ];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">Stats & history</h1>
        <button className="btn-ghost" onClick={() => confirm('Clear all stats and bet history?') && resetStats()}>Reset</button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="panel p-4">
            <div className="label">{t.label}</div>
            <div className={`mt-1 font-mono text-xl font-bold ${t.tone ?? ''}`}>{t.value}</div>
          </div>
        ))}
      </div>
      <div className="panel p-4">
        <div className="label mb-2">Profit, last {Math.max(0, stats.series.length - 1)} bets</div>
        <ProfitChart series={stats.series} />
      </div>
      <RecentBets />
    </div>
  );
}
