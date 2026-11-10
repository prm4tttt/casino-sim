import { HOUSE_RTP, floor2 } from '../money';

export type VaultSymbol = 'gem' | 'gold' | 'silver' | 'bronze' | 'alarm';

export const VAULT_DIALS = 9;
export const VAULT_PICKS = 3;

export const VAULT_PROBS: Record<VaultSymbol, number> = {
  gem: 0.08,
  gold: 0.17,
  silver: 0.25,
  bronze: 0.3,
  alarm: 0.2,
};
const ORDER: VaultSymbol[] = ['gem', 'gold', 'silver', 'bronze', 'alarm'];

// Relative weights; scaled below so the game returns exactly 99%.
const TRIPLE: Record<string, number> = { gem: 60, gold: 14, silver: 6, bronze: 3.5 };
const PAIR: Record<string, number> = { gem: 3.5, gold: 2, silver: 1.5, bronze: 1.2 };

export function vaultSymbol(f: number): VaultSymbol {
  let acc = 0;
  for (const s of ORDER) {
    acc += VAULT_PROBS[s];
    if (f < acc) return s;
  }
  return 'alarm';
}

function rawPayout(picked: VaultSymbol[]): number {
  const alarms = picked.filter((s) => s === 'alarm').length;
  const counts = new Map<VaultSymbol, number>();
  for (const s of picked) if (s !== 'alarm') counts.set(s, (counts.get(s) ?? 0) + 1);
  let base = 0;
  for (const [s, n] of counts) {
    if (n === 3) base = TRIPLE[s];
    else if (n === 2) base = PAIR[s];
  }
  // Every alarm you trip halves the haul.
  return base * 0.5 ** alarms;
}

let scale: number | null = null;
function getScale(): number {
  if (scale !== null) return scale;
  let expected = 0;
  for (const a of ORDER)
    for (const b of ORDER)
      for (const c of ORDER)
        expected += VAULT_PROBS[a] * VAULT_PROBS[b] * VAULT_PROBS[c] * rawPayout([a, b, c]);
  scale = HOUSE_RTP / expected;
  return scale;
}

export const vaultPayout = (picked: VaultSymbol[]) => floor2(rawPayout(picked) * getScale());

export function vaultPaytable(): { label: string; symbols: VaultSymbol[]; mult: number }[] {
  const rows: { label: string; symbols: VaultSymbol[]; mult: number }[] = [];
  for (const s of ['gem', 'gold', 'silver', 'bronze'] as VaultSymbol[])
    rows.push({ label: `3 × ${s}`, symbols: [s, s, s], mult: vaultPayout([s, s, s]) });
  for (const s of ['gem', 'gold', 'silver', 'bronze'] as VaultSymbol[]) {
    const other: VaultSymbol = s === 'bronze' ? 'silver' : 'bronze';
    rows.push({ label: `2 × ${s}`, symbols: [s, s, other], mult: vaultPayout([s, s, other]) });
  }
  return rows;
}
export const VAULT_SYMBOLS = ORDER;
