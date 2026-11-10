import { Link } from 'react-router-dom';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { GAMES } from '../lib/gameList';

export default function Lobby() {
  return (
    <div className="space-y-8">
      <section className="panel relative overflow-hidden p-6 sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-40 h-64 w-64 rounded-full bg-cyan/20 blur-3xl" />
        <div className="relative max-w-xl">
          <span className="chip mb-4 bg-violet/30 text-violet-100"><Sparkles size={12} className="mr-1" /> Free play · no real money</span>
          <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
            Ten games. One balance. <span className="text-cyan">Every result checkable.</span>
          </h1>
          <p className="mt-3 text-muted">
            You start with 1,000 play credits and can refill whenever you like. Each outcome comes from a seed
            you can verify yourself.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/dice" className="btn-primary">Start with Dice</Link>
            <Link to="/fairness" className="btn-ghost"><ShieldCheck size={16} /> How fairness works</Link>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-extrabold">All games</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {GAMES.map((g) => (
            <Link
              key={g.id}
              to={g.path}
              className={`group relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-2xl border border-line bg-gradient-to-br ${g.tint} p-4 transition hover:-translate-y-1 hover:border-cyan/60 hover:shadow-glow`}
            >
              <div className="flex items-start justify-between">
                <g.icon size={40} strokeWidth={1.6} className="text-white/90 transition group-hover:text-cyan" />
                {g.original && <span className="chip bg-violet text-white">Original</span>}
              </div>
              <div>
                <div className="text-base font-extrabold">{g.name}</div>
                <div className="mt-0.5 text-xs leading-snug text-slate-300/80">{g.blurb}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
