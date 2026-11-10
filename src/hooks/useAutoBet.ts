import { useCallback, useEffect, useRef, useState } from 'react';
import { round2 } from '../lib/money';

export interface AutoConfig {
  /** 0 = run until stopped. */
  count: number;
  /** Percent to raise the bet after a win / loss. 0 = reset to the base bet. */
  onWin: number;
  onLoss: number;
  stopProfit: number;
  stopLoss: number;
}

export const defaultAuto: AutoConfig = { count: 10, onWin: 0, onLoss: 0, stopProfit: 0, stopLoss: 0 };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** `play` resolves to the payout, or null if the bet could not be placed. */
export function useAutoBet(play: (amount: number) => Promise<number | null>, delay = 300) {
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(0);
  const stopRef = useRef(false);
  const playRef = useRef(play);
  playRef.current = play;

  useEffect(() => () => void (stopRef.current = true), []);

  const start = useCallback(
    async (base: number, cfg: AutoConfig) => {
      stopRef.current = false;
      setRunning(true);
      let amount = base;
      let profit = 0;
      for (let i = 0; !stopRef.current && (cfg.count === 0 || i < cfg.count); i++) {
        const payout = await playRef.current(amount);
        if (payout === null) break;
        setLeft(cfg.count ? cfg.count - i - 1 : 0);
        const net = payout - amount;
        profit += net;
        if (net > 0) amount = cfg.onWin > 0 ? round2(amount * (1 + cfg.onWin / 100)) : base;
        else if (net < 0) amount = cfg.onLoss > 0 ? round2(amount * (1 + cfg.onLoss / 100)) : base;
        if (cfg.stopProfit > 0 && profit >= cfg.stopProfit) break;
        if (cfg.stopLoss > 0 && profit <= -cfg.stopLoss) break;
        await sleep(delay);
      }
      setRunning(false);
    },
    [delay],
  );

  const stop = useCallback(() => void (stopRef.current = true), []);
  return { running, left, start, stop };
}
