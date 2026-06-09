import { Logo } from "@/components/brand/Logo";
import { formatCurrency } from "@/lib/utils";

interface PosHeaderProps {
  orderCount: number;
  total: number;
}

export function PosHeader({ orderCount, total }: PosHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-border/60 bg-card/90 px-3 py-2 backdrop-blur-sm sm:px-6 sm:py-3">
      <Logo size="sm" className="scale-90 sm:scale-100" />

      <div className="flex items-center gap-3 sm:gap-6">
        <div className="hidden text-right xs:block sm:block">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Sepette
          </p>
          <p className="text-base font-semibold sm:text-lg">{orderCount} parça</p>
        </div>
        <div className="rounded-xl bg-trust-light/80 px-3 py-1.5 text-right sm:rounded-2xl sm:px-5 sm:py-2">
          <p className="text-[10px] font-medium text-trust sm:text-xs">Anlık Toplam</p>
          <p className="text-lg font-bold text-foreground sm:text-2xl">
            {formatCurrency(total)}
          </p>
        </div>
      </div>
    </header>
  );
}
