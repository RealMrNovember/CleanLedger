import { Search, X } from "lucide-react";
import type { OrderDeliveryFilter } from "@cleanledger/shared";
import { useI18n } from "@/context/I18nContext";
import { cn } from "@/lib/utils";

const FILTERS: OrderDeliveryFilter[] = ["all", "active", "delivered"];

interface OrdersSearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  deliveryFilter: OrderDeliveryFilter;
  onDeliveryFilterChange: (value: OrderDeliveryFilter) => void;
  resultCount?: number;
  className?: string;
}

export function OrdersSearchBar({
  query,
  onQueryChange,
  deliveryFilter,
  onDeliveryFilterChange,
  resultCount,
  className,
}: OrdersSearchBarProps) {
  const { t, labels } = useI18n();
  const hasQuery = query.trim().length > 0;

  return (
    <div className={cn("flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center", className)}>
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={t("orders.searchPlaceholder")}
          aria-label={t("orders.searchAria")}
          className="h-9 w-full rounded-full border border-border/60 bg-muted/25 py-0 pl-9 pr-9 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-mint/50 focus:bg-background focus:ring-2 focus:ring-mint/20"
        />
        {hasQuery && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label={t("orders.clearSearch")}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div
          className="inline-flex rounded-full border border-border/60 bg-muted/20 p-0.5"
          role="group"
          aria-label={t("orders.filterAria")}
        >
          {FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => onDeliveryFilterChange(filter)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold transition sm:px-3",
                deliveryFilter === filter
                  ? "bg-white text-[#0f3d3a] shadow-sm dark:bg-slate-800 dark:text-mint"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {labels.deliveryFilter[filter]}
            </button>
          ))}
        </div>
        {hasQuery && resultCount !== undefined && (
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {t("orders.resultCount", { count: String(resultCount) })}
          </span>
        )}
      </div>
    </div>
  );
}
