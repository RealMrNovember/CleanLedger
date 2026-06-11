import { useState } from "react";
import { Plus } from "lucide-react";
import type { Product } from "@/db/schema";
import { ProductVisual } from "@/components/pos/ProductVisual";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AddProductDialog } from "@/components/settings/AddProductDialog";
import { useI18n } from "@/context/I18nContext";

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
  const { t, translateProduct } = useI18n();
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
            {t("pos.catalogTitle")}
          </h2>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {t("pos.catalogHint")}
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="grid w-full grid-cols-3 gap-1.5 sm:grid-cols-3 sm:gap-2 md:grid-cols-3 md:gap-3 lg:grid-cols-4">
            {products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onSelectProduct(product)}
                  className={cn(
                    "group flex min-h-[84px] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-border/40 p-2",
                    "bg-gradient-to-b from-white to-slate-50/80 shadow-sm transition-all duration-200 dark:border-slate-700/60 dark:from-slate-800 dark:to-slate-900/80",
                    "hover:border-mint/50 hover:shadow-md hover:shadow-mint/10",
                    "active:scale-[0.97] active:border-mint",
                    "sm:min-h-[108px] sm:gap-2 sm:rounded-2xl sm:p-3 md:min-h-[128px] md:p-4",
                  )}
                >
                  <ProductVisual
                    name={product.name}
                    iconName={product.iconName}
                    size="md"
                    interactive
                  />
                  <span className="line-clamp-2 text-center text-[10px] font-semibold leading-tight text-gray-900 dark:text-gray-100 sm:text-xs md:text-sm">
                    {translateProduct(product)}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground sm:text-xs">
                    {formatCurrency(product.basePrice)}
                  </span>
                </button>
              ))}
          </div>
          <div className="mt-2 hidden border-t border-border/40 pt-2 md:block">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full gap-2 border-dashed"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="size-4" />
              {t("pos.catalogAddProduct")}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
