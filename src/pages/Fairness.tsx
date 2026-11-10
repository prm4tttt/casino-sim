import { useEffect, useState } from 'react';
import { Copy, RefreshCw } from 'lucide-react';
import { Field, NumberInput } from '../components/BetControls';
import { generateFloats, sha256Hex } from '../lib/fair';
import { GAMES } from '../lib/gameList';
import { RANKS, SUITS, cardFromFloat } from '../lib/games/cards';
import { diceRoll } from '../lib/games/dice';
import { kenoDraw } from '../lib/games/keno';
import { LADDER_STEPS, flip } from '../lib/games/ladder';
import { limboResult } from '../lib/games/limbo';
import { minePositions } from '../lib/games/mines';
import { plinkoBucket, plinkoPath } from '../lib/games/plinko';
import { VAULT_DIALS, vaultSymbol } from '../lib/games/vault';
import { fmtMult } from '../lib/money';
import { useStore, type GameId } from '../store/useStore';

function Mono({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2">
      <code className="input block flex-1 truncate !py-2 text-xs">{children || '—'}</code>
      <button className="btn-ghost !px-2.5" title="Copy" onClick={() => navigator.clipboard?.writeText(children)}><Copy size={14} /></button>
    </div>
  );
}

async function describe(game: GameId, serverSeed: string, clientSeed: string, nonce: number, param: number): Promise<string> {
  const seed = { serverSeed, clientSeed, nonce };
  const cards = (fs: number[]) => fs.map(cardFromFloat).map((c) => RANKS[c.rank] + SUITS[c.suit]).join('  ');
  switch (game) {
    case 'dice':
      return `Roll: ${diceRoll((await generateFloats(seed, 1))[0]).toFixed(2)}`;
    case 'limbo':
      return `Result: ${fmtMult(limboResult((await generateFloats(seed, 1))[0]))}`;
    case 'crash':
      return `Crash point: ${fmtMult(limboResult((await generateFloats(seed, 1))[0]))}`;
    case 'mines': {
      const mines = Math.min(24, Math.max(1, param || 3));
      const pos = minePositions(await generateFloats(seed, 24), mines).map((p) => p + 1).sort((a, b) => a - b);
      return `Mines (${mines}) on tiles: ${pos.join(', ')}  (tiles numbered 1-25, left to right, top to bottom)`;
    }
    case 'plinko': {
      const rows = Math.min(16, Math.max(8, param || 16));
      const path = plinkoPath(await generateFloats(seed, 16), rows);
      return `Path (${rows} rows): ${path.map((d) => (d ? 'R' : 'L')).join('')}  → bucket ${plinkoBucket(path) + 1} of ${rows + 1}`;
    }
    case 'keno':
      return `Drawn: ${kenoDraw(await generateFloats(seed, 10)).join(', ')}`;
    case 'hilo':
      return `Cards in order: ${cards(await generateFloats(seed, 12))} …`;
    case 'blackjack':
      return `Cards in deal order (player, dealer, player, dealer, then draws): ${cards(await generateFloats(seed, 12))} …`;
    case 'ladder':
      return `Flips: ${(await generateFloats(seed, LADDER_STEPS)).map(flip).map((s) => s[0].toUpperCase()).join(' ')}`;
    case 'vault':
      return `Dials 1-9: ${(await generateFloats(seed, VAULT_DIALS)).map(vaultSymbol).join(', ')}`;
  }
}

function Verifier() {
  const [serverSeed, setServerSeed] = useState('');
  const [clientSeed, setClientSeed] = useState('');
  const [nonce, setNonce] = useState(1);
  const [game, setGame] = useState<GameId>('dice');
  const [param, setParam] = useState(0);
  const [out, setOut] = useState<{ hash: string; text: string } | null>(null);
  const needsParam = game === 'mines' || game === 'plinko';

  useEffect(() => {
    let live = true;
    if (!serverSeed || !clientSeed) return setOut(null);
    (async () => {
      const [hash, text] = await Promise.all([sha256Hex(serverSeed), describe(game, serverSeed, clientSeed, nonce, param)]);
      if (live) setOut({ hash, text });
    })();
    return () => void (live = false);
  }, [serverSeed, clientSeed, nonce, game, param]);

  return (
    <div className="panel space-y-4 p-5">
      <div>
        <h2 className="text-base font-bold">Verify a bet</h2>
        <p className="text-sm text-muted">Paste a revealed server seed, the client seed and the bet's nonce to recompute the result.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Server seed (revealed)"><input className="input" value={serverSeed} onChange={(e) => setServerSeed(e.target.value.trim())} /></Field>
        <Field label="Client seed"><input className="input" value={clientSeed} onChange={(e) => setClientSeed(e.target.value.trim())} /></Field>
        <Field label="Nonce"><NumberInput value={nonce} onChange={(v) => setNonce(Math.max(0, Math.floor(v)))} step={1} /></Field>
        <Field label="Game">
          <select className="input" value={game} onChange={(e) => { setGame(e.target.value as GameId); setParam(0); }}>
            {GAMES.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </Field>
        {needsParam && (
          <Field label={game === 'mines' ? 'Mines (1-24)' : 'Rows (8-16)'}>
            <NumberInput value={param || (game === 'mines' ? 3 : 16)} onChange={(v) => setParam(Math.floor(v))} step={1} />
          </Field>
        )}
      </div>
      {out && (
        <div className="space-y-2 rounded-xl border border-line bg-well p-4">
          <div className="label">Server seed hash (SHA-256)</div>
          <code className="block break-all font-mono text-xs text-muted">{out.hash}</code>
          <div className="label pt-2">Outcome</div>
          <div className="break-words font-mono text-sm text-cyan" data-testid="verify-out">{out.text}</div>
        </div>
      )}
    </div>
  );
}

export default function Fairness() {
  const seeds = useStore((s) => s.seeds);
  const revealed = useStore((s) => s.revealed);
  const rotateSeeds = useStore((s) => s.rotateSeeds);
  const [nextClient, setNextClient] = useState('');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold">Fairness</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Every result is computed from <code className="text-slate-200">HMAC-SHA256(server seed, client seed : nonce : round)</code>.
          You see the server seed's hash before you bet, so it can't be changed afterwards. Rotate the seed pair
          to reveal the old server seed, then check any bet from it below.
        </p>
      </div>

      <div className="panel space-y-4 p-5">
        <h2 className="text-base font-bold">Active seed pair</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Server seed (hashed)"><Mono>{seeds?.serverSeedHash ?? ''}</Mono></Field>
          <Field label="Client seed"><Mono>{seeds?.clientSeed ?? ''}</Mono></Field>
          <Field label="Bets made with this pair"><div className="input">{seeds?.nonce ?? 0}</div></Field>
          <Field label="New client seed (optional)">
            <input className="input" value={nextClient} placeholder="Keep current" onChange={(e) => setNextClient(e.target.value)} />
          </Field>
        </div>
        <button className="btn-primary" onClick={() => rotateSeeds(nextClient).then(() => setNextClient(''))}>
          <RefreshCw size={16} /> Rotate & reveal server seed
        </button>
        <p className="text-xs text-muted">Finish any game in progress before rotating: a round keeps the seed it started with.</p>
      </div>

      {revealed.length > 0 && (
        <div className="panel space-y-3 p-5">
          <h2 className="text-base font-bold">Revealed seeds</h2>
          {revealed.map((r) => (
            <div key={r.serverSeedHash} className="space-y-2 rounded-xl border border-line bg-well p-3">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
                <span>Client seed <code className="text-slate-200">{r.clientSeed}</code></span>
                <span>Nonces <code className="text-slate-200">1 – {r.bets}</code></span>
              </div>
              <Mono>{r.serverSeed}</Mono>
            </div>
          ))}
        </div>
      )}

      <Verifier />

      <p className="text-xs text-muted">
        Note: this simulator runs entirely in your browser, so the "server" seed is generated on your device.
        The scheme is the same one a hosted site would use, shown here so you can see how verification works.
      </p>
    </div>
  );
}
