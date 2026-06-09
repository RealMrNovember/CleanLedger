export function WebLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg viewBox="0 0 48 48" className="size-10 shrink-0" aria-hidden>
        <defs>
          <linearGradient id="web-logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4ECDC4" />
            <stop offset="100%" stopColor="#45B7D1" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="14" fill="url(#web-logo-bg)" />
        <path
          d="M14 28c0-6 4.5-10 10-10s10 4 10 10"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M24 14v6M19 17l5-3 5 3"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="24" cy="30" r="2" fill="white" />
      </svg>
      <div>
        <p className="text-lg font-bold tracking-tight">
          Clean<span className="text-[#4ECDC4]">Ledger</span>
        </p>
        <p className="text-xs text-muted">Cicibyte</p>
      </div>
    </div>
  );
}
