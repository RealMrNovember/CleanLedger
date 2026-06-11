import { Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/context/I18nContext";

interface PosStickyBarProps {
  total: number;
  itemCount: number;
  disabled: boolean;
  onPay: () => void;
}

export function PosStickyBar({
  total,
  itemCount,
  disabled,
  onPay,
}: PosStickyBarProps) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95 md:hidden">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            {itemCount > 0
              ? `${t("pos.stickyPieces", { count: String(itemCount) })} `
              : ""}
            {t("pos.stickyTotal")}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(total)}
          </p>
        </div>
        <Button
          variant="accent"
          size="lg"
          className="min-w-[7.5rem] gap-2 px-6"
          disabled={disabled}
          onClick={onPay}
        >
          <Wallet className="size-5" />
          {t("pos.pay")}
        </Button>
      </div>
    </div>
  );
}
