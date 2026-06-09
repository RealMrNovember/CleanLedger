import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Loader2,
  Trash2,
} from "lucide-react";
import type { Product } from "@/db/schema";
import { SERVICE_LABELS, SERVICE_TYPES } from "@/db/schema";
import { deleteProduct, reorderProducts } from "@/db/client";
import { ProductVisual } from "@/components/pos/ProductVisual";
import { getProductIconLabel } from "@/lib/product-icons";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
  const [dragId, setDragId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const applyOrder = async (orderedIds: number[]) => {
    setError("");
    await reorderProducts(orderedIds);
    await onChanged();
  };

  const moveProduct = async (productId: number, direction: "up" | "down") => {
    const ids = products.map((product) => product.id);
    const index = ids.indexOf(productId);
    if (index < 0) return;

    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= ids.length) return;

    const next = [...ids];
    [next[index], next[target]] = [next[target], next[index]];

    setBusyId(productId);
    try {
      await applyOrder(next);
    } catch {
      setError("Sıralama güncellenemedi.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDrop = async (targetId: number) => {
    if (dragId == null || dragId === targetId) return;

    const ids = products.map((product) => product.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;

    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, dragId);

    setBusyId(dragId);
    try {
      await applyOrder(next);
    } catch {
      setError("Sıralama güncellenemedi.");
    } finally {
      setBusyId(null);
      setDragId(null);
    }
  };

  const handleDelete = async (product: Product) => {
    const confirmed = window.confirm(
      `"${product.name}" ürününü silmek istediğinize emin misiniz?`,
    );
    if (!confirmed) return;

    setBusyId(product.id);
    setError("");
    try {
      await deleteProduct(product.id);
      await onChanged();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ürün silinemedi.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Sürükleyerek veya oklarla sıralayın. POS kataloğu bu sırayı kullanır.
      </p>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="space-y-2">
        {products.map((product, index) => {
          const isBusy = busyId === product.id;
          const isDragging = dragId === product.id;

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
              <div className="flex items-start gap-2 sm:gap-3">
                <button
                  type="button"
                  draggable
                  onDragStart={() => setDragId(product.id)}
                  className="mt-1 flex size-8 shrink-0 cursor-grab items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 active:cursor-grabbing"
                  title="Sürükleyerek sırala"
                  aria-label="Sürükleyerek sırala"
                >
                  <GripVertical className="size-4" />
                </button>

                <ProductVisual
                  name={product.name}
                  iconName={product.iconName}
                  size="sm"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{product.name}</p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      #{index + 1}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {getProductIconLabel(product.iconName)}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-4">
                    {SERVICE_TYPES.map((serviceType) => (
                      <div key={serviceType} className="flex justify-between gap-2 sm:block">
                        <span className="text-muted-foreground">
                          {SERVICE_LABELS[serviceType]}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(getPrice(product.id, serviceType))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8"
                    disabled={index === 0 || isBusy}
                    onClick={() => void moveProduct(product.id, "up")}
                    title="Yukarı taşı"
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8"
                    disabled={index === products.length - 1 || isBusy}
                    onClick={() => void moveProduct(product.id, "down")}
                    title="Aşağı taşı"
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={isBusy}
                    onClick={() => void handleDelete(product)}
                    title="Ürünü sil"
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
