import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { box: "size-9", text: "text-base", sub: "text-[10px]" },
  md: { box: "size-11", text: "text-lg", sub: "text-xs" },
  lg: { box: "size-14", text: "text-2xl", sub: "text-sm" },
};

export function Logo({ size = "md", showText = true, className }: LogoProps) {
  const s = sizes[size];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-2xl shadow-sm",
          s.box
        )}
      >
        <svg
          viewBox="0 0 48 48"
          className={cn("absolute inset-0 size-full", s.box)}
          aria-hidden
        >
          <defs>
            <linearGradient id="cl-logo-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4ECDC4" />
              <stop offset="100%" stopColor="#45B7D1" />
            </linearGradient>
            <linearGradient id="cl-logo-shine" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect width="48" height="48" rx="14" fill="url(#cl-logo-bg)" />
          <rect width="48" height="24" rx="14" fill="url(#cl-logo-shine)" />
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
            strokeLinejoin="round"
          />
          <circle cx="24" cy="30" r="2" fill="white" opacity="0.95" />
        </svg>
      </div>
      {showText && (
        <div className="min-w-0">
          <p className={cn("font-bold tracking-tight text-foreground", s.text)}>
            Clean<span className="text-mint">Ledger</span>
          </p>
          <p className={cn("truncate text-muted-foreground", s.sub)}>Cicibyte</p>
        </div>
      )}
    </div>
  );
}
