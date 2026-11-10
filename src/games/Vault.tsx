import { useCallback, useState } from 'react';
import { BellRing, Crown, Gem, Hexagon, Lock, Star, type LucideIcon } from 'lucide-react';
import GameShell from '../components/GameShell';
import InstantControls from '../components/InstantControls';
import { gameById } from '../lib/gameList';
import { VAULT_DIALS, VAULT_PICKS, VAULT_PROBS, vaultPayout, vaultPaytable, vaultSymbol, type VaultSymbol } from '../lib/games/vault';
import { fmt, fmtMult, payoutFor } from '../lib/money';
import { roundFloats, useStore } from '../store/useStore';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const LOOK: Record<VaultSymbol, { icon: LucideIcon; cls: string; name: string }> = {
  gem: { icon: Gem, cls: 'text-cyan', name: 'Gem' },
  gold: { icon: Crown, cls: 'text-amber-300', name: 'Gold' },
  silver: { icon: Star, cls: 'text-slate-300', name: 'Silver' },
  bronze: { icon: Hexagon, cls: 'text-orange-400', name: 'Bronze' },
  alarm: { icon: BellRing, cls: 'text-loss', name: 'Alarm' },
};

function Sym({ s, size = 16 }: { s: VaultSymbol; size?: number }) {
  const { icon: Icon, cls } = LOOK[s];
  return <Icon size={size} className={cls} />;
}

export default function Vault() {
  const [picks, setPicks] = useState<number[]>([]);
  const [board, setBoard] = useState<VaultSymbol[] | null>(null);
  const [open, setOpen] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ mult: number; net: number } | null>(null);

  const toggle = (i: number) => {
    if (busy) return;
    if (board) {
      setBoard(null);
      setOpen([]);
      setResult(null);
    }
    setPicks((p) => (p.includes(i) ? p.filter((x) => x !== i) : p.length < VAULT_PICKS ? [...p, i] : p));
  };

  const play = useCallback(
    async (amount: number) => {
      if (picks.length !== VAULT_PICKS) return null;
      const round = useStore.getState().begin('vault', amount);
      if (!round) return null;
      setBusy(true);
      setResult(null);
      setOpen([]);
      const symbols = (await roundFloats(round, VAULT_DIALS)).map(vaultSymbol);
      setBoard(symbols);
      const mult = vaultPayout(picks.map((i) => symbols[i]));
      const payout = payoutFor(amount, mult);
      for (let n = 1; n <= picks.length; n++) {
        await sleep(260);
        setOpen(picks.slice(0, n));
      }
      await sleep(200);
      useStore.getState().settle(round, amount, payout);
      setOpen(Array.from({ length: VAULT_DIALS }, (_, i) => i));
      setResult({ mult, net: payout - amount });
      setBusy(false);
      return payout;
    },
    [picks],
  );

  return (
    <GameShell
      game={gameById('vault')}
      controls={
        <InstantControls play={play} label="Crack it" extraDisabled={picks.length !== VAULT_PICKS || busy} delay={500}>
          <p className="text-xs leading-relaxed text-muted">
            Choose 3 of the 9 dials, then crack the vault. Match symbols on your dials to win. Every alarm you
            trip halves the haul.
          </p>
          {picks.length !== VAULT_PICKS && <p className="text-xs font-semibold text-cyan">Pick {VAULT_PICKS - picks.length} more dial{VAULT_PICKS - picks.length === 1 ? '' : 's'}.</p>}
        </InstantControls>
      }
      aside={
        <div className="panel p-4">
          <h2 className="mb-3 text-sm font-bold">Paytable</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {vaultPaytable().map((row) => (
              <div key={row.label} className="flex items-center justify-between rounded-lg bg-well px-3 py-2">
                <span className="flex gap-1">{row.symbols.slice(0, row.label.startsWith('3') ? 3 : 2).map((s, i) => <Sym key={i} s={s} />)}</span>
                <span className="font-mono text-sm font-bold">{fmtMult(row.mult)}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            {(Object.keys(LOOK) as VaultSymbol[]).map((s) => (
              <span key={s} className="flex items-center gap-1"><Sym s={s} size={13} /> {LOOK[s].name} {(VAULT_PROBS[s] * 100).toFixed(0)}%</span>
            ))}
            <span>· A pair with one alarm pays half.</span>
          </p>
        </div>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        <div className="h-6 text-sm font-bold" data-testid="vault-status">
          {result ? (
            <span className={result.net > 0 ? 'text-win' : result.mult > 0 ? 'text-slate-200' : 'text-loss'}>
              {result.mult > 0 ? `Haul ${fmtMult(result.mult)} · ${result.net >= 0 ? '+' : ''}${fmt(result.net)}` : 'Empty-handed'}
            </span>
          ) : (
            <span className="text-muted">{picks.length}/{VAULT_PICKS} dials chosen</span>
          )}
        </div>
        <div className="grid w-full max-w-sm grid-cols-3 gap-3">
          {Array.from({ length: VAULT_DIALS }, (_, i) => {
            const picked = picks.includes(i);
            const shown = board && open.includes(i);
            const s = board?.[i];
            return (
              <button
                key={i}
                data-testid={`dial-${i}`}
                onClick={() => toggle(i)}
                disabled={busy}
                aria-pressed={picked}
                aria-label={`Dial ${i + 1}`}
                className={`grid aspect-square place-items-center rounded-full border-2 transition ${
                  picked ? 'border-cyan bg-cyan/10 shadow-glow' : 'border-line bg-raised hover:border-cyan/50'
                } ${shown && !picked ? 'opacity-45' : ''}`}
              >
                {shown && s ? (
                  <span className="animate-pop"><Sym s={s} size={44} /></span>
                ) : (
                  <Lock size={30} className={picked ? 'text-cyan' : 'text-muted/60'} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </GameShell>
  );
}
