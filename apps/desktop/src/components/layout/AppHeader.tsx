import { Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface AppHeaderProps {
  orderCount: number;
  total: number;
}

export function AppHeader({ orderCount, total }: AppHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-border/60 bg-card/90 px-6 py-4 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-mint to-trust text-white shadow-sm">
          <Sparkles className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">CleanLedger</h1>
          <p className="text-xs text-muted-foreground">
            Cicibyte · Kuru Temizleme
          </p>
        </div>
      </div>

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
