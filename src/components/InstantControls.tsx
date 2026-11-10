import { useState, type ReactNode } from 'react';
import { defaultAuto, useAutoBet } from '../hooks/useAutoBet';
import { AmountInput, AutoFields, BalanceHint, Segmented, useCanBet } from './BetControls';

/**
 * Bet panel shared by every single-click game: manual and auto tabs, the
 * amount field, any game-specific fields, and the bet button.
 */
export default function InstantControls({
  play,
  children,
  label = 'Bet',
  delay,
  extraDisabled,
}: {
  play: (amount: number) => Promise<number | null>;
  children?: ReactNode | ((locked: boolean) => ReactNode);
  label?: string;
  delay?: number;
  extraDisabled?: boolean;
}) {
  const [mode, setMode] = useState<'manual' | 'auto'>('manual');
  const [amount, setAmount] = useState(10);
  const [cfg, setCfg] = useState(defaultAuto);
  const [busy, setBusy] = useState(false);
  const auto = useAutoBet(play, delay);
  const canBet = useCanBet(amount) && !extraDisabled;
  const locked = auto.running;

  const manual = async () => {
    setBusy(true);
    try {
      await play(amount);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Segmented
        value={mode}
        onChange={setMode}
        disabled={locked}
        options={[{ value: 'manual', label: 'Manual' }, { value: 'auto', label: 'Auto' }]}
      />
      <AmountInput amount={amount} setAmount={setAmount} disabled={locked} />
      {typeof children === 'function' ? children(locked) : children}
      {mode === 'auto' && <AutoFields cfg={cfg} setCfg={setCfg} disabled={locked} />}
      {mode === 'manual' ? (
        <button className="btn-primary w-full !py-3.5 !text-base" disabled={!canBet || busy} onClick={manual} data-testid="bet">
          {label}
        </button>
      ) : auto.running ? (
        <button className="btn-danger w-full !py-3.5 !text-base" onClick={auto.stop}>
          Stop auto{cfg.count ? ` (${auto.left} left)` : ''}
        </button>
      ) : (
        <button className="btn-primary w-full !py-3.5 !text-base" disabled={!canBet} onClick={() => auto.start(amount, cfg)}>
          Start auto
        </button>
      )}
      <BalanceHint amount={amount} />
    </>
  );
}
