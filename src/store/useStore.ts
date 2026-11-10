import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateFloats, randomHex, sha256Hex } from '../lib/fair';
import { payoutFor, round2 } from '../lib/money';

export type GameId =
  | 'dice'
  | 'limbo'
  | 'mines'
  | 'plinko'
  | 'crash'
  | 'keno'
  | 'hilo'
  | 'blackjack'
  | 'ladder'
  | 'vault';

export const START_BALANCE = 1000;
const MAX_BETS = 200;
const MAX_SERIES = 300;

export interface BetRecord {
  id: string;
  game: GameId;
  amount: number;
  multiplier: number;
  payout: number;
  time: number;
  nonce: number;
  clientSeed: string;
  serverSeedHash: string;
}

export interface Seeds {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

export interface RevealedSeed {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  bets: number;
}

/** Everything a game needs to resolve and later record one bet. */
export interface Round {
  game: GameId;
  amount: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

interface Stats {
  wagered: number;
  profit: number;
  wins: number;
  losses: number;
  series: number[];
}

interface State {
  balance: number;
  seeds: Seeds | null;
  revealed: RevealedSeed[];
  bets: BetRecord[];
  stats: Stats;
  initSeeds: () => Promise<void>;
  rotateSeeds: (clientSeed?: string) => Promise<void>;
  refill: () => void;
  /** Takes the stake and reserves a nonce. Returns null if it can't be placed. */
  begin: (game: GameId, amount: number) => Round | null;
  /** Extra stake on a round in progress (double, split, insurance). */
  addStake: (amount: number) => boolean;
  /** Pays out mid-round without closing it (e.g. banking half). */
  credit: (amount: number) => void;
  /** Closes a round: pays `payout` and writes the bet to history. */
  settle: (round: Round, totalStake: number, totalPayout: number, creditNow?: number) => void;
  resetStats: () => void;
}

const emptyStats = (): Stats => ({ wagered: 0, profit: 0, wins: 0, losses: 0, series: [0] });

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      balance: START_BALANCE,
      seeds: null,
      revealed: [],
      bets: [],
      stats: emptyStats(),

      initSeeds: async () => {
        if (get().seeds) return;
        const serverSeed = randomHex(32);
        const serverSeedHash = await sha256Hex(serverSeed);
        if (get().seeds) return;
        set({ seeds: { serverSeed, serverSeedHash, clientSeed: randomHex(8), nonce: 0 } });
      },

      rotateSeeds: async (clientSeed) => {
        const old = get().seeds;
        const serverSeed = randomHex(32);
        const serverSeedHash = await sha256Hex(serverSeed);
        set((s) => ({
          seeds: {
            serverSeed,
            serverSeedHash,
            clientSeed: clientSeed?.trim() || old?.clientSeed || randomHex(8),
            nonce: 0,
          },
          revealed: old
            ? [
                { serverSeed: old.serverSeed, serverSeedHash: old.serverSeedHash, clientSeed: old.clientSeed, bets: old.nonce },
                ...s.revealed,
              ].slice(0, 20)
            : s.revealed,
        }));
      },

      refill: () => set((s) => ({ balance: round2(s.balance + START_BALANCE) })),

      begin: (game, amount) => {
        const { seeds, balance } = get();
        amount = round2(amount);
        if (!seeds || !(amount > 0) || amount > balance) return null;
        const nonce = seeds.nonce + 1;
        set({ balance: round2(balance - amount), seeds: { ...seeds, nonce } });
        return {
          game,
          amount,
          nonce,
          serverSeed: seeds.serverSeed,
          serverSeedHash: seeds.serverSeedHash,
          clientSeed: seeds.clientSeed,
        };
      },

      addStake: (amount) => {
        amount = round2(amount);
        const { balance } = get();
        if (!(amount > 0) || amount > balance) return false;
        set({ balance: round2(balance - amount) });
        return true;
      },

      credit: (amount) => set((s) => ({ balance: round2(s.balance + amount) })),

      settle: (round, totalStake, totalPayout, creditNow = totalPayout) => {
        totalStake = round2(totalStake);
        totalPayout = round2(totalPayout);
        const net = round2(totalPayout - totalStake);
        const bet: BetRecord = {
          id: `${round.serverSeedHash.slice(0, 8)}-${round.nonce}`,
          game: round.game,
          amount: totalStake,
          multiplier: totalStake > 0 ? totalPayout / totalStake : 0,
          payout: totalPayout,
          time: Date.now(),
          nonce: round.nonce,
          clientSeed: round.clientSeed,
          serverSeedHash: round.serverSeedHash,
        };
        set((s) => {
          const profit = round2(s.stats.profit + net);
          return {
            balance: round2(s.balance + creditNow),
            bets: [bet, ...s.bets].slice(0, MAX_BETS),
            stats: {
              wagered: round2(s.stats.wagered + totalStake),
              profit,
              wins: s.stats.wins + (net > 0 ? 1 : 0),
              losses: s.stats.losses + (net < 0 ? 1 : 0),
              series: [...s.stats.series, profit].slice(-MAX_SERIES),
            },
          };
        });
      },

      resetStats: () => set({ stats: emptyStats(), bets: [] }),
    }),
    { name: 'clutch-picks-v1' },
  ),
);

export const roundFloats = (round: Round, count: number) => generateFloats(round, count);
export const simplePayout = payoutFor;
