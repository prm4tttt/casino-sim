import { useEffect, useRef, useState } from 'react';
import GameShell from '../components/GameShell';
import PlayingCard from '../components/PlayingCard';
import { AmountInput, BalanceHint, useCanBet } from '../components/BetControls';
import { gameById } from '../lib/gameList';
import { canSplit, dealerShouldHit, handTotal, isBlackjack, isBust, settleHand } from '../lib/games/blackjack';
import { cardFromFloat, type Card } from '../lib/games/cards';
import { fmt, round2 } from '../lib/money';
import { roundFloats, useStore, type Round } from '../store/useStore';

interface Hand {
  cards: Card[];
  stake: number;
  done: boolean;
  fromSplit: boolean;
  result?: number;
}

interface Game {
  round: Round;
  floats: number[];
  next: number;
  dealer: Card[];
  /** How many dealer cards are face up. */
  shown: number;
  hands: Hand[];
  active: number;
  phase: 'insurance' | 'player' | 'dealer' | 'done';
  insurance: number;
  totalStake: number;
  payout: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clone = (g: Game): Game => ({ ...g, dealer: [...g.dealer], hands: g.hands.map((h) => ({ ...h, cards: [...h.cards] })) });
const draw = (g: Game): Card => cardFromFloat(g.floats[g.next++]);

/** Plays out the dealer and scores every hand. Pure: no money moves here. */
function resolve(input: Game): Game {
  const g = clone(input);
  g.hands.forEach((h) => (h.done = true));
  const dealerMustPlay = g.hands.some((h) => !isBust(h.cards) && !(isBlackjack(h.cards) && !h.fromSplit));
  if (dealerMustPlay) while (dealerShouldHit(g.dealer)) g.dealer.push(draw(g));
  let payout = 0;
  for (const h of g.hands) {
    h.result = settleHand(h.cards, g.dealer, h.fromSplit);
    payout += h.stake * h.result;
  }
  if (g.insurance > 0 && isBlackjack(g.dealer)) payout += g.insurance * 3;
  g.payout = round2(payout);
  return g;
}

const RESULT: Record<string, { label: string; cls: string }> = {
  '2.5': { label: 'Blackjack', cls: 'bg-win text-bg' },
  '2': { label: 'Win', cls: 'bg-win text-bg' },
  '1': { label: 'Push', cls: 'bg-raised text-slate-200' },
  '0': { label: 'Lose', cls: 'bg-loss/20 text-loss' },
};

export default function Blackjack() {
  const [amount, setAmount] = useState(10);
  const [game, setGame] = useState<Game | null>(null);
  const [dealing, setDealing] = useState(false);
  const live = useRef<Game | null>(null);
  live.current = game;
  const settled = useRef<number | null>(null);
  const balance = useStore((s) => s.balance);
  const canBet = useCanBet(amount);

  const pay = (g: Game) => {
    if (settled.current === g.round.nonce) return;
    settled.current = g.round.nonce;
    useStore.getState().settle(g.round, g.totalStake, g.payout);
  };

  // Leaving mid-hand stands on everything and settles straight away.
  useEffect(
    () => () => {
      const g = live.current;
      if (g && g.phase !== 'done') pay(resolve(g));
    },
    [],
  );

  /** Reveal the dealer's cards one at a time, then pay. */
  const conclude = async (g: Game) => {
    const fin = resolve(g);
    setGame({ ...fin, phase: 'dealer', shown: 1 });
    for (let n = 2; n <= fin.dealer.length; n++) {
      await sleep(450);
      if (settled.current === fin.round.nonce) return;
      setGame({ ...fin, phase: 'dealer', shown: n });
    }
    await sleep(250);
    pay(fin);
    setGame({ ...fin, phase: 'done', shown: fin.dealer.length });
  };

  const afterPeek = (g: Game) => {
    if (isBlackjack(g.dealer) || isBlackjack(g.hands[0].cards)) return void conclude(g);
    setGame({ ...g, phase: 'player' });
  };

  const progress = (g: Game) => {
    const next = g.hands.findIndex((h) => !h.done);
    if (next === -1) return void conclude(g);
    setGame({ ...g, active: next });
  };

  const deal = async () => {
    setDealing(true);
    const round = useStore.getState().begin('blackjack', amount);
    if (round) {
      const floats = await roundFloats(round, 64);
      const c = floats.slice(0, 4).map(cardFromFloat);
      const g: Game = {
        round, floats, next: 4,
        dealer: [c[1], c[3]], shown: 1,
        hands: [{ cards: [c[0], c[2]], stake: round.amount, done: false, fromSplit: false }],
        active: 0, phase: 'player', insurance: 0, totalStake: round.amount, payout: 0,
      };
      if (g.dealer[0].rank === 1) setGame({ ...g, phase: 'insurance' });
      else afterPeek(g);
    }
    setDealing(false);
  };

  const insure = (take: boolean) => {
    if (!game) return;
    const g = clone(game);
    const cost = round2(g.round.amount / 2);
    if (take && useStore.getState().addStake(cost)) {
      g.insurance = cost;
      g.totalStake = round2(g.totalStake + cost);
    }
    afterPeek(g);
  };

  const act = (move: 'hit' | 'stand' | 'double' | 'split') => {
    if (!game || game.phase !== 'player') return;
    const g = clone(game);
    const h = g.hands[g.active];
    if (move === 'stand') h.done = true;
    if (move === 'hit') {
      h.cards.push(draw(g));
      if (handTotal(h.cards).total >= 21) h.done = true;
    }
    if (move === 'double') {
      if (!useStore.getState().addStake(h.stake)) return;
      g.totalStake = round2(g.totalStake + h.stake);
      h.stake = round2(h.stake * 2);
      h.cards.push(draw(g));
      h.done = true;
    }
    if (move === 'split') {
      if (!useStore.getState().addStake(h.stake)) return;
      g.totalStake = round2(g.totalStake + h.stake);
      const aces = h.cards[0].rank === 1;
      g.hands = h.cards.map((card) => {
        const cards = [card, draw(g)];
        // Split aces get one card each.
        return { cards, stake: h.stake, fromSplit: true, done: aces || handTotal(cards).total === 21 };
      });
    }
    progress(g);
  };

  const hand = game?.hands[game.active];
  const myTurn = game?.phase === 'player' && !!hand;
  const canDouble = myTurn && hand!.cards.length === 2 && balance >= hand!.stake;
  const canSplitNow = myTurn && game!.hands.length === 1 && canSplit(hand!.cards) && balance >= hand!.stake;
  const inPlay = !!game && game.phase !== 'done';
  const dealerVisible = game ? game.dealer.slice(0, game.shown) : [];
  const net = game ? round2(game.payout - game.totalStake) : 0;

  return (
    <GameShell
      game={gameById('blackjack')}
      controls={
        <>
          <AmountInput amount={amount} setAmount={setAmount} disabled={inPlay} />
          {game?.phase === 'insurance' ? (
            <>
              <p className="text-sm text-muted">Dealer shows an ace. Insurance costs {fmt(round2(game.round.amount / 2))} and pays 2:1 if the dealer has blackjack.</p>
              <div className="grid grid-cols-2 gap-3">
                <button className="btn-primary" disabled={balance < game.round.amount / 2} onClick={() => insure(true)}>Insure</button>
                <button className="btn-ghost" onClick={() => insure(false)} data-testid="bj-noins">No thanks</button>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button className="btn-ghost !py-3" disabled={!myTurn} onClick={() => act('hit')} data-testid="bj-hit">Hit</button>
              <button className="btn-ghost !py-3" disabled={!myTurn} onClick={() => act('stand')} data-testid="bj-stand">Stand</button>
              <button className="btn-ghost !py-3" disabled={!canDouble} onClick={() => act('double')}>Double</button>
              <button className="btn-ghost !py-3" disabled={!canSplitNow} onClick={() => act('split')}>Split</button>
            </div>
          )}
          <button className="btn-primary w-full !py-3.5 !text-base" disabled={!canBet || inPlay || dealing} onClick={deal} data-testid="bet">Deal</button>
          <BalanceHint amount={amount} />
          <p className="text-xs leading-relaxed text-muted">Blackjack pays 3:2. Dealer stands on 17. Double on any two cards. One split per hand.</p>
        </>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-between gap-6 py-2">
        <div className="flex flex-col items-center gap-2">
          <div className="label">Dealer {game && <span className="ml-1 font-mono text-slate-100">{handTotal(dealerVisible).total}</span>}</div>
          <div className="flex min-h-24 gap-2">
            {game ? (
              <>
                {dealerVisible.map((c, i) => <PlayingCard key={i} card={c} />)}
                {game.shown < 2 && <PlayingCard />}
              </>
            ) : (
              <><PlayingCard /><PlayingCard /></>
            )}
          </div>
        </div>

        <div className="h-7 text-sm font-bold" data-testid="bj-status">
          {game?.phase === 'done' && (
            <span className={net > 0 ? 'text-win' : net < 0 ? 'text-loss' : 'text-muted'}>
              {net > 0 ? `You win +${fmt(net)}` : net < 0 ? `You lose ${fmt(-net)}` : 'Push. Stake returned.'}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-start justify-center gap-6">
          {(game?.hands ?? [null]).map((h, i) => {
            const active = game?.phase === 'player' && game.active === i;
            const res = h?.result !== undefined ? (h.result === 0 && isBust(h.cards) ? { label: 'Bust', cls: RESULT['0'].cls } : RESULT[String(h.result)]) : null;
            return (
              <div key={i} className={`flex flex-col items-center gap-2 rounded-2xl border p-3 transition ${active ? 'border-cyan/60 bg-cyan/5' : 'border-transparent'}`}>
                <div className="flex min-h-24 gap-2">
                  {h ? h.cards.map((c, j) => <PlayingCard key={j} card={c} />) : <><PlayingCard /><PlayingCard /></>}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="label">You {h && <span className="ml-1 font-mono text-slate-100">{handTotal(h.cards).total}</span>}</span>
                  {h && <span className="font-mono text-muted">{fmt(h.stake)}</span>}
                  {res && game?.phase === 'done' && <span className={`chip ${res.cls}`}>{res.label}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </GameShell>
  );
}
