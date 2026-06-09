import { Logo } from "@/components/brand/Logo";

interface PosHeaderProps {
  orderCount: number;
}

export function PosHeader({ orderCount }: PosHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-border/60 bg-card/90 px-3 py-2 backdrop-blur-sm sm:px-6 sm:py-3">
      <Logo size="sm" className="scale-90 sm:scale-100" />
      {orderCount > 0 && (
        <div className="rounded-xl bg-mint-light/80 px-3 py-1.5 text-right sm:px-4 sm:py-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-[#0f3d3a]/70 sm:text-xs">
            Sepette
          </p>
          <p className="text-base font-bold text-[#0f3d3a] sm:text-lg">
            {orderCount} parça
          </p>
        </div>
      )}
    </header>
  );
}
