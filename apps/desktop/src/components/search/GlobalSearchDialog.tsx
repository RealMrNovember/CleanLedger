import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ClipboardList, User } from "lucide-react";
import type { GlobalSearchHit } from "@cleanledger/shared";
import { runGlobalSearch } from "@/db/client";
import { formatCustomerName } from "@/lib/utils";
import type { OrderStatus } from "@/db/schema";
import { useI18n } from "@/context/I18nContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchDialog({
  open,
  onOpenChange,
}: GlobalSearchDialogProps) {
  const { t, labels } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      return;
    }
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setLoading(true);
      void runGlobalSearch(trimmed)
        .then(setResults)
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(timer);
  }, [query, open]);

  const handleSelect = (hit: GlobalSearchHit) => {
    onOpenChange(false);
    if (hit.kind === "order") {
      navigate("/orders", { state: { selectedOrderId: hit.id } });
      return;
    }
    navigate(`/customers/${hit.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border/60 px-4 py-3">
          <DialogTitle className="sr-only">{t("search.globalTitle")}</DialogTitle>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search.globalPlaceholder")}
              className="h-11 w-full rounded-xl border border-border/60 bg-muted/20 py-0 pl-10 pr-3 text-sm outline-none focus:border-mint/50 focus:ring-2 focus:ring-mint/20"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("search.globalHint")}
          </p>
        </DialogHeader>
        <div className="max-h-[min(60vh,24rem)] overflow-y-auto p-2">
          {loading && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {t("search.globalLoading")}
            </p>
          )}
          {!loading && query.trim() && results.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {t("search.globalNoResults")}
            </p>
          )}
          {!loading &&
            results.map((hit) => (
              <button
                key={`${hit.kind}-${hit.id}`}
                type="button"
                onClick={() => handleSelect(hit)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-muted/60"
              >
                {hit.kind === "order" ? (
                  <ClipboardList className="size-4 shrink-0 text-trust" />
                ) : (
                  <User className="size-4 shrink-0 text-mint" />
                )}
                <div className="min-w-0 flex-1">
                  {hit.kind === "order" ? (
                    <>
                      <p className="truncate font-medium">{hit.orderNumber}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {hit.customerName ?? t("search.globalUnnamed")} ·{" "}
                        {hit.customerPhone} ·{" "}
                        {labels.orderStatus[hit.orderStatus as OrderStatus]}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="truncate font-medium">
                        {formatCustomerName(hit)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {hit.phone}
                      </p>
                    </>
                  )}
                </div>
              </button>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
