import { gameById } from '../lib/gameList';
import { fmt, fmtMult } from '../lib/money';
import { useStore } from '../store/useStore';

export default function RecentBets({ limit }: { limit?: number }) {
  const all = useStore((s) => s.bets);
  const bets = limit ? all.slice(0, limit) : all;
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-sm font-bold">{limit ? 'Recent bets' : 'Bet history'}</h2>
        <span className="text-xs text-muted">{all.length} recorded</span>
      </div>
      {bets.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted">No bets yet. Place one to see it here.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-4 py-2 font-semibold">Game</th>
                <th className="px-4 py-2 font-semibold">Time</th>
                <th className="px-4 py-2 text-right font-semibold">Bet</th>
                <th className="px-4 py-2 text-right font-semibold">Multiplier</th>
                <th className="px-4 py-2 text-right font-semibold">Payout</th>
              </tr>
            </thead>
            <tbody>
              {bets.map((b) => {
                const net = b.payout - b.amount;
                return (
                  <tr key={b.id} className="border-t border-line/60">
                    <td className="px-4 py-2 font-semibold">{gameById(b.game).name}</td>
                    <td className="px-4 py-2 text-muted">{new Date(b.time).toLocaleTimeString()}</td>
                    <td className="px-4 py-2 text-right font-mono">{fmt(b.amount)}</td>
                    <td className="px-4 py-2 text-right font-mono text-muted">{fmtMult(b.multiplier)}</td>
                    <td className={`px-4 py-2 text-right font-mono font-bold ${net > 0 ? 'text-win' : net < 0 ? 'text-muted' : ''}`}>
                      {net > 0 ? '+' : ''}{fmt(net)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
