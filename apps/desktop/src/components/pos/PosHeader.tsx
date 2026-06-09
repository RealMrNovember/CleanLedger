import { Logo } from "@/components/brand/Logo";
import { formatCurrency } from "@/lib/utils";

interface PosHeaderProps {
  orderCount: number;
  total: number;
}

export function PosHeader({ orderCount, total }: PosHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-border/60 bg-card/90 px-6 py-3 backdrop-blur-sm">
      <Logo size="sm" />

      <div className="flex items-center gap-6">
        <div className="hidden text-right sm:block">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Sepette
          </p>
          <p className="text-lg font-semibold">{orderCount} parça</p>
        </div>
        <div className="rounded-2xl bg-trust-light/80 px-5 py-2 text-right">
          <p className="text-xs font-medium text-trust">Anlık Toplam</p>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(total)}
          </p>
        </div>
      </div>
    </header>
  );
}
