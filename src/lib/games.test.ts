import { describe, expect, it } from 'vitest';
import { generateFloats, sha256Hex } from './fair';
import { choose, drawWithoutReplacement } from './money';
import { diceChance, diceMultiplier, diceRoll, diceWins } from './games/dice';
import { limboResult } from './games/limbo';
import { minePositions, minesMultiplier } from './games/mines';
import { PLINKO_ROWS, plinkoTable, type Risk } from './games/plinko';
import { kenoDraw, kenoHitProb, kenoTable } from './games/keno';
import { hiloOptions, hiloWins } from './games/hilo';
import { handTotal, isBlackjack, settleHand } from './games/blackjack';
import { VAULT_PROBS, VAULT_SYMBOLS, vaultPayout, vaultSymbol } from './games/vault';
import { ladderMultiplier } from './games/ladder';

const RISKS: Risk[] = ['low', 'medium', 'high'];
const seed = { serverSeed: 'server', clientSeed: 'client', nonce: 1 };

describe('fair', () => {
  it('is deterministic and uniform in [0,1)', async () => {
    const a = await generateFloats(seed, 20);
    const b = await generateFloats(seed, 20);
    expect(a).toEqual(b);
    expect(a.every((f) => f >= 0 && f < 1)).toBe(true);
    const c = await generateFloats({ ...seed, nonce: 2 }, 20);
    expect(c).not.toEqual(a);
  });
  it('hashes with SHA-256', async () => {
    expect(await sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
  it('has a mean near 0.5', async () => {
    const fs = await generateFloats(seed, 20000);
    const mean = fs.reduce((a, b) => a + b, 0) / fs.length;
    expect(mean).toBeGreaterThan(0.49);
    expect(mean).toBeLessThan(0.51);
  });
});

describe('dice', () => {
  it('returns ~99% at every target', () => {
    for (const over of [true, false])
      for (let target = 2; target <= 98; target += 0.5) {
        const chance = diceChance(target, over);
        let wins = 0;
        for (let k = 0; k <= 10000; k++) if (diceWins(k / 100, target, over)) wins++;
        const rtp = (wins / 10001) * diceMultiplier(chance);
        expect(rtp).toBeGreaterThan(0.985);
        expect(rtp).toBeLessThanOrEqual(0.99 + 1e-9);
      }
  });
  it('rolls within range', () => {
    expect(diceRoll(0)).toBe(0);
    expect(diceRoll(0.999999999)).toBe(100);
  });
});

describe('limbo / crash', () => {
  it('P(result >= m) = 0.99/m', () => {
    const n = 400000;
    for (const m of [1.5, 2, 10, 100]) {
      let hits = 0;
      for (let i = 0; i < n; i++) if (limboResult((i + 0.5) / n) >= m) hits++;
      expect(hits / n).toBeCloseTo(0.99 / m, 3);
    }
  });
  it('never goes below 1', () => expect(limboResult(0)).toBe(1));
});

describe('mines', () => {
  it('pays 99% of fair odds', () => {
    for (const mines of [1, 3, 10, 24])
      for (let k = 1; k <= 25 - mines; k++) {
        const pSurvive = choose(25 - mines, k) / choose(25, k);
        const rtp = pSurvive * minesMultiplier(mines, k);
        expect(rtp).toBeLessThanOrEqual(0.9900001);
        expect(rtp).toBeGreaterThan(0.97);
      }
  });
  it('places distinct mines', async () => {
    const pos = minePositions(await generateFloats(seed, 24), 24);
    expect(new Set(pos).size).toBe(24);
  });
});

describe('plinko', () => {
  it('every table returns just under 99%', () => {
    for (const rows of PLINKO_ROWS)
      for (const risk of RISKS) {
        const t = plinkoTable(rows, risk);
        expect(t).toHaveLength(rows + 1);
        const rtp = t.reduce((s, m, k) => s + (choose(rows, k) / 2 ** rows) * m, 0);
        expect(rtp).toBeLessThanOrEqual(0.99 + 1e-9);
        expect(rtp).toBeGreaterThan(0.97);
        expect(t[0]).toBe(t[rows]);
        expect(t[0]).toBeGreaterThan(t[Math.floor(rows / 2)]);
      }
  });
});

describe('keno', () => {
  it('hit probabilities sum to 1', () => {
    for (let p = 1; p <= 10; p++) {
      let s = 0;
      for (let h = 0; h <= p; h++) s += kenoHitProb(p, h);
      expect(s).toBeCloseTo(1, 10);
    }
  });
  it('every table returns just under 99%', () => {
    for (let p = 1; p <= 10; p++)
      for (const risk of RISKS) {
        const t = kenoTable(p, risk);
        const rtp = t.reduce((s, m, h) => s + kenoHitProb(p, h) * m, 0);
        expect(rtp).toBeLessThanOrEqual(0.99 + 1e-9);
        expect(rtp).toBeGreaterThan(0.95);
      }
  });
  it('draws 10 distinct numbers in 1..40', async () => {
    const d = kenoDraw(await generateFloats(seed, 10));
    expect(new Set(d).size).toBe(10);
    expect(d.every((n) => n >= 1 && n <= 40)).toBe(true);
  });
});

describe('hilo', () => {
  it('stated probabilities match the win rule', () => {
    for (let cur = 1; cur <= 13; cur++)
      for (const choice of ['higher', 'lower'] as const) {
        let wins = 0;
        for (let next = 1; next <= 13; next++) if (hiloWins(choice, cur, next)) wins++;
        expect(wins / 13).toBeCloseTo(hiloOptions(cur)[choice].prob, 10);
      }
  });
});

describe('blackjack', () => {
  const c = (rank: number) => ({ rank, suit: 0 });
  it('totals hands with soft aces', () => {
    expect(handTotal([c(1), c(6)])).toEqual({ total: 17, soft: true });
    expect(handTotal([c(1), c(6), c(10)])).toEqual({ total: 17, soft: false });
    expect(handTotal([c(1), c(1), c(9)]).total).toBe(21);
    expect(isBlackjack([c(1), c(13)])).toBe(true);
  });
  it('settles hands', () => {
    expect(settleHand([c(1), c(13)], [c(10), c(9)], false)).toBe(2.5);
    expect(settleHand([c(1), c(13)], [c(10), c(9)], true)).toBe(2);
    expect(settleHand([c(1), c(13)], [c(1), c(10)], false)).toBe(1);
    expect(settleHand([c(10), c(9)], [c(1), c(10)], false)).toBe(0);
    expect(settleHand([c(10), c(9), c(5)], [c(10), c(6), c(10)], false)).toBe(0);
    expect(settleHand([c(10), c(9)], [c(10), c(6), c(10)], false)).toBe(2);
    expect(settleHand([c(10), c(8)], [c(10), c(8)], false)).toBe(1);
  });
});

describe('vault cracker', () => {
  it('returns just under 99%', () => {
    let rtp = 0;
    for (const a of VAULT_SYMBOLS)
      for (const b of VAULT_SYMBOLS)
        for (const d of VAULT_SYMBOLS)
          rtp += VAULT_PROBS[a] * VAULT_PROBS[b] * VAULT_PROBS[d] * vaultPayout([a, b, d]);
    expect(rtp).toBeLessThanOrEqual(0.99 + 1e-9);
    expect(rtp).toBeGreaterThan(0.975);
  });
  it('maps floats to symbols', () => {
    expect(vaultSymbol(0)).toBe('gem');
    expect(vaultSymbol(0.999)).toBe('alarm');
  });
  it('alarms halve the payout', () => {
    expect(vaultPayout(['gold', 'gold', 'alarm'])).toBeLessThan(vaultPayout(['gold', 'gold', 'bronze']));
    expect(vaultPayout(['alarm', 'alarm', 'alarm'])).toBe(0);
  });
});

describe('coin ladder', () => {
  it('doubles each step at 99%', () => {
    expect(ladderMultiplier(0)).toBe(1);
    expect(ladderMultiplier(1)).toBe(1.98);
    expect(ladderMultiplier(10)).toBe(1013.76);
  });
});

describe('drawWithoutReplacement', () => {
  it('is unbiased enough', () => {
    const counts = new Array(5).fill(0);
    const n = 5000;
    for (let i = 0; i < n; i++) counts[drawWithoutReplacement(5, 1, [(i + 0.5) / n])[0]]++;
    for (const c of counts) expect(c).toBe(n / 5);
  });
});
