import { useState } from "react";
import { Plus } from "lucide-react";
import type { Product } from "@/db/schema";
import { getProductIcon } from "@/lib/product-icons";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AddProductDialog } from "@/components/settings/AddProductDialog";

interface ProductCatalogProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onProductAdded: () => void;
}

export function ProductCatalog({
  products,
  onSelectProduct,
  onProductAdded,
}: ProductCatalogProps) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <AddProductDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={onProductAdded}
      />
      <div className="flex h-full w-full flex-col pb-2 md:pb-0">
        <div className="mb-2 shrink-0 px-1 sm:mb-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 sm:text-lg">
            Ürün Seç
          </h2>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Eklemek için ürüne dokunun
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid w-full grid-cols-3 gap-1.5 sm:grid-cols-3 sm:gap-2 md:grid-cols-3 md:gap-3 lg:grid-cols-4">
            {products.map((product) => {
              const Icon = getProductIcon(product.iconName);
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onSelectProduct(product)}
                  className={cn(
                    "group flex min-h-[76px] w-full flex-col items-center justify-center gap-1 rounded-xl border border-transparent p-1.5",
                    "bg-white shadow-sm transition-all duration-200 dark:bg-slate-800",
                    "hover:border-mint/40 hover:bg-mint-light/40 dark:hover:bg-slate-700",
                    "active:scale-[0.97] active:border-mint",
                    "sm:min-h-[100px] sm:gap-2 sm:rounded-2xl sm:p-3 md:min-h-[120px] md:p-4"
                  )}
                >
                  <div className="flex size-9 items-center justify-center rounded-lg bg-trust-light/80 text-trust transition-colors group-hover:bg-mint/20 group-hover:text-mint sm:size-12 sm:rounded-xl md:size-14">
                    <Icon className="size-5 stroke-[1.5] sm:size-6 md:size-7" />
                  </div>
                  <span className="line-clamp-2 text-center text-[10px] font-semibold leading-tight text-gray-900 dark:text-gray-100 sm:text-xs md:text-sm">
                    {product.name}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground sm:text-xs">
                    {formatCurrency(product.basePrice)}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-2 hidden border-t border-border/40 pt-2 md:block">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full gap-2 border-dashed"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="size-4" />
              Yeni Ürün Ekle
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
