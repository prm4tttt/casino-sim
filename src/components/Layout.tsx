import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Activity, Home, Menu, Plus, ShieldCheck, X } from 'lucide-react';
import { GAMES } from '../lib/gameList';
import { fmt } from '../lib/money';
import { useStore } from '../store/useStore';
import { Logo } from './Logo';

function NavItem({ to, icon: Icon, children, tag }: { to: string; icon: React.ElementType; children: React.ReactNode; tag?: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition ${
          isActive ? 'bg-cyan/10 text-cyan' : 'text-muted hover:bg-raised hover:text-slate-100'
        }`
      }
    >
      <Icon size={18} />
      <span className="flex-1">{children}</span>
      {tag && <span className="chip bg-violet/25 text-violet-200">{tag}</span>}
    </NavLink>
  );
}

function Sidebar() {
  return (
    <nav className="flex flex-col gap-1 p-3">
      <NavItem to="/" icon={Home}>Lobby</NavItem>
      <div className="label px-3 pt-4 pb-1">Games</div>
      {GAMES.map((g) => (
        <NavItem key={g.id} to={g.path} icon={g.icon} tag={g.original ? 'New' : undefined}>
          {g.name}
        </NavItem>
      ))}
      <div className="label px-3 pt-4 pb-1">Account</div>
      <NavItem to="/stats" icon={Activity}>Stats & history</NavItem>
      <NavItem to="/fairness" icon={ShieldCheck}>Fairness</NavItem>
    </nav>
  );
}

export default function Layout() {
  const balance = useStore((s) => s.balance);
  const refill = useStore((s) => s.refill);
  const initSeeds = useStore((s) => s.initSeeds);
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  useEffect(() => void initSeeds(), [initSeeds]);
  useEffect(() => setOpen(false), [loc.pathname]);

  return (
    <div className="min-h-screen lg:pl-60">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 overflow-y-auto border-r border-line bg-card lg:block">
        <Link to="/" className="flex h-16 items-center px-5"><Logo /></Link>
        <Sidebar />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 overflow-y-auto border-r border-line bg-card">
            <div className="flex h-16 items-center justify-between px-5">
              <Logo />
              <button className="text-muted" onClick={() => setOpen(false)} aria-label="Close menu"><X /></button>
            </div>
            <Sidebar />
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-bg/90 px-4 backdrop-blur">
        <button className="text-muted lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu /></button>
        <Link to="/" className="lg:hidden"><Logo /></Link>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-line bg-well px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-cyan shadow-glow" />
            <span className="font-mono text-sm font-bold" data-testid="balance">{fmt(balance)}</span>
            <span className="hidden text-xs font-semibold text-muted sm:inline">CP</span>
          </div>
          <button className="btn-primary !px-3" onClick={refill} title="Add 1,000 play credits">
            <Plus size={16} /> <span className="hidden sm:inline">Refill</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-4 text-xs leading-relaxed text-muted">
        Clutch Picks is a free-play simulator. Credits (CP) are play money with no cash value: nothing can be
        deposited, withdrawn or won.
      </footer>
    </div>
  );
}
