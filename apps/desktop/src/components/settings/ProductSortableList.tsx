import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Loader2,
  Trash2,
} from "lucide-react";
import type { Product } from "@/db/schema";
import { SERVICE_TYPES } from "@/db/schema";
import { deleteProduct, reorderProducts } from "@/db/client";
import { ProductVisual } from "@/components/pos/ProductVisual";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/context/I18nContext";

interface ProductSortableListProps {
  products: Product[];
  getPrice: (
    productId: number,
    serviceType: (typeof SERVICE_TYPES)[number],
  ) => number;
  onChanged: () => Promise<void>;
}

export function ProductSortableList({
  products,
  getPrice,
  onChanged,
}: ProductSortableListProps) {
  const { t, labels, translateProduct } = useI18n();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const applyOrder = async (next: Product[]) => {
    await reorderProducts(next.map((p) => p.id));
    await onChanged();
  };

  const handleMove = async (productId: number, direction: "up" | "down") => {
    const index = products.findIndex((p) => p.id === productId);
    if (index < 0) return;
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= products.length) return;

    const next = [...products];
    [next[index], next[target]] = [next[target], next[index]];

    setBusyId(productId);
    setError("");
    try {
      await applyOrder(next);
    } catch {
      setError(t("settings.productReorderFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const handleDrop = async (targetId: number) => {
    if (dragId == null || dragId === targetId) return;
    const from = products.findIndex((p) => p.id === dragId);
    const to = products.findIndex((p) => p.id === targetId);
    if (from < 0 || to < 0) return;

    const next = [...products];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    setBusyId(dragId);
    setError("");
    try {
      await applyOrder(next);
    } catch {
      setError(t("settings.productReorderFailed"));
    } finally {
      setBusyId(null);
      setDragId(null);
    }
  };

  const handleDelete = async (product: Product) => {
    const displayName = translateProduct(product);
    const confirmed = window.confirm(
      t("settings.productDeleteConfirm", { name: displayName }),
    );
    if (!confirmed) return;

    setBusyId(product.id);
    setError("");
    try {
      await deleteProduct(product.id);
      await onChanged();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("settings.productDeleteFailed"),
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("settings.productSortHint")}</p>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="space-y-3">
        {products.map((product, index) => {
          const isBusy = busyId === product.id;
          const isDragging = dragId === product.id;
          const displayName = translateProduct(product);

          return (
            <div
              key={product.id}
              draggable={!isBusy}
              onDragStart={() => setDragId(product.id)}
              onDragEnd={() => setDragId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => void handleDrop(product.id)}
              className={cn(
                "rounded-2xl border border-border/60 bg-card p-3 transition sm:p-4",
                isDragging && "opacity-50 ring-2 ring-mint/40",
                dragId != null &&
                  dragId !== product.id &&
                  "hover:border-mint/40 hover:bg-mint-light/10",
              )}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  draggable
                  onDragStart={() => setDragId(product.id)}
                  className="mt-2 flex size-8 shrink-0 cursor-grab items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 active:cursor-grabbing"
                  title={t("settings.productSortDragAria")}
                  aria-label={t("settings.productSortDragAria")}
                >
                  <GripVertical className="size-4" />
                </button>

                <ProductVisual
                  name={product.name}
                  iconName={product.iconName}
                  size="md"
                  className="mt-0.5"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <p className="text-base font-bold leading-tight">{displayName}</p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      #{index + 1}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {SERVICE_TYPES.map((serviceType) => (
                      <div
                        key={serviceType}
                        className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5 dark:bg-muted/10"
                      >
                        <p className="line-clamp-2 text-[11px] font-medium leading-snug text-muted-foreground">
                          {labels.service[serviceType]}
                        </p>
                        <p className="mt-1.5 text-sm font-semibold tabular-nums tracking-tight text-foreground">
                          {formatCurrency(getPrice(product.id, serviceType))}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={isBusy || index === 0}
                    onClick={() => void handleMove(product.id, "up")}
                    aria-label={t("settings.productMoveUp")}
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={isBusy || index === products.length - 1}
                    onClick={() => void handleMove(product.id, "down")}
                    aria-label={t("settings.productMoveDown")}
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive hover:text-destructive"
                    disabled={isBusy}
                    onClick={() => void handleDelete(product)}
                    aria-label={t("common.delete")}
                  >
                    {isBusy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
