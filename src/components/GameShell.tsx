import type { ReactNode } from 'react';
import type { GameMeta } from '../lib/gameList';
import RecentBets from './RecentBets';

export default function GameShell({
  game,
  controls,
  children,
  aside,
}: {
  game: GameMeta;
  controls: ReactNode;
  children: ReactNode;
  /** Optional extra block under the stage (paytables, rules). */
  aside?: ReactNode;
}) {
  const Icon = game.icon;
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan/10 text-cyan"><Icon size={20} /></span>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold leading-tight">
            {game.name}
            {game.original && <span className="chip bg-violet text-white">Clutch original</span>}
          </h1>
          <p className="text-sm text-muted">{game.blurb}</p>
        </div>
      </div>
      <div className="panel grid overflow-hidden lg:grid-cols-[320px_1fr]">
        <div className="order-2 space-y-4 border-t border-line p-4 lg:order-1 lg:border-r lg:border-t-0">{controls}</div>
        <div className="order-1 flex min-h-[360px] flex-col bg-well/60 p-4 sm:p-6 lg:order-2">{children}</div>
      </div>
      {aside}
      <RecentBets limit={8} />
    </div>
  );
}
