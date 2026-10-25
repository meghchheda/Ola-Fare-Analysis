export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="7" fill="#173C35" stroke="#34564B" />
      <path d="M7 23 C 12 23, 11 9, 16 9 S 21 23, 25 23" fill="none" stroke="#C7F464" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="7" cy="23" r="2.4" fill="#FF795E" />
      <circle cx="25" cy="23" r="2.4" fill="#71C7D8" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <div className="flex items-center gap-3">
      <LogoMark />
      <div className="leading-none">
        <div className="font-extrabold tracking-tight text-[15px]">
          OLA <span className="text-lime">RIDE</span>
        </div>
        <div className="font-mono text-[10px] tracking-[0.2em] text-sage mt-1">INSIGHTS</div>
      </div>
    </div>
  );
}
