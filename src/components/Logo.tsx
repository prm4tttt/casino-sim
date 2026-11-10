export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <path d="M22 9.5A9 9 0 1 0 22 22.5" fill="none" stroke="#00F0FF" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="22.5" cy="16" r="3" fill="#7000FF" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="text-lg font-extrabold tracking-tight">
        Clutch<span className="text-cyan">Picks</span>
      </span>
    </span>
  );
}
