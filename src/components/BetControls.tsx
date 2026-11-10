import type { ReactNode } from 'react';
import { fmt, round2 } from '../lib/money';
import { useStore } from '../store/useStore';
import type { AutoConfig } from '../hooks/useAutoBet';

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between">
        <span className="label">{label}</span>
        {hint && <span className="text-xs font-medium text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function NumberInput({
  value,
  onChange,
  disabled,
  min = 0,
  max,
  step = 'any',
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number | 'any';
  suffix?: ReactNode;
}) {
  return (
    <div className="relative">
      <input
        className="input"
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : ''}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        onBlur={() => {
          let v = Number.isFinite(value) ? value : min;
          if (v < min) v = min;
          if (max !== undefined && v > max) v = max;
          if (v !== value) onChange(v);
        }}
      />
      {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-bold text-muted">{suffix}</span>}
    </div>
  );
}

export function AmountInput({ amount, setAmount, disabled }: { amount: number; setAmount: (v: number) => void; disabled?: boolean }) {
  const balance = useStore((s) => s.balance);
  const set = (v: number) => setAmount(Math.max(0, round2(v)));
  return (
    <Field label="Bet amount" hint={`Balance ${fmt(balance)}`}>
      <div className="flex gap-1.5">
        <div className="flex-1">
          <NumberInput value={amount} onChange={set} disabled={disabled} suffix="CP" />
        </div>
        <button type="button" className="btn-ghost !px-3" disabled={disabled} onClick={() => set(amount / 2)}>½</button>
        <button type="button" className="btn-ghost !px-3" disabled={disabled} onClick={() => set(Math.min(amount * 2, balance))}>2×</button>
        <button type="button" className="btn-ghost !px-3" disabled={disabled} onClick={() => set(balance)}>Max</button>
      </div>
    </Field>
  );
}

export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  disabled,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  disabled?: boolean;
}) {
  return (
    <div className="flex rounded-lg border border-line bg-well p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-bold capitalize transition disabled:opacity-50 ${
            value === o.value ? 'bg-raised text-cyan' : 'text-muted hover:text-slate-100'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function AutoFields({ cfg, setCfg, disabled }: { cfg: AutoConfig; setCfg: (c: AutoConfig) => void; disabled?: boolean }) {
  const up = (k: keyof AutoConfig) => (v: number) => setCfg({ ...cfg, [k]: Math.max(0, v) });
  return (
    <>
      <Field label="Number of bets" hint="0 = until stopped">
        <NumberInput value={cfg.count} onChange={(v) => up('count')(Math.floor(v))} disabled={disabled} step={1} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="On win" hint="0 = reset">
          <NumberInput value={cfg.onWin} onChange={up('onWin')} disabled={disabled} suffix="+%" />
        </Field>
        <Field label="On loss" hint="0 = reset">
          <NumberInput value={cfg.onLoss} onChange={up('onLoss')} disabled={disabled} suffix="+%" />
        </Field>
        <Field label="Stop on profit">
          <NumberInput value={cfg.stopProfit} onChange={up('stopProfit')} disabled={disabled} suffix="CP" />
        </Field>
        <Field label="Stop on loss">
          <NumberInput value={cfg.stopLoss} onChange={up('stopLoss')} disabled={disabled} suffix="CP" />
        </Field>
      </div>
    </>
  );
}

/** True when `amount` can be staked right now. */
export function useCanBet(amount: number): boolean {
  const balance = useStore((s) => s.balance);
  const ready = useStore((s) => !!s.seeds);
  return ready && amount > 0 && amount <= balance;
}

export function BalanceHint({ amount }: { amount: number }) {
  const balance = useStore((s) => s.balance);
  if (amount <= balance) return null;
  return <p className="text-xs font-medium text-loss">Not enough credits. Lower the bet or hit Refill.</p>;
}
