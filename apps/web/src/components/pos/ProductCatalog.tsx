import type { Product } from "@/db/schema";
import { getProductIcon } from "@/lib/product-icons";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ProductCatalogProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

export function ProductCatalog({ products, onSelectProduct }: ProductCatalogProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 px-1">
        <h2 className="text-lg font-semibold text-foreground/80">Ürün Seç</h2>
        <p className="text-sm text-muted-foreground">
          Eklemek için ürüne dokunun
        </p>
      </div>
      <div className="grid flex-1 grid-cols-2 gap-2 overflow-y-auto pr-1 xs:gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => {
          const Icon = getProductIcon(product.iconName);
          return (
            <button
              key={product.id}
              type="button"
              onClick={() => onSelectProduct(product)}
              className={cn(
                "group flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-transparent sm:min-h-[120px] sm:gap-3",
                "bg-card p-2 sm:p-4 shadow-sm transition-all duration-200",
                "hover:border-mint/40 hover:bg-mint-light/40 hover:shadow-md",
                "active:scale-[0.97] active:border-mint"
              )}
            >
              <div className="flex size-12 items-center justify-center rounded-xl bg-trust-light/80 text-trust transition-colors group-hover:bg-mint/20 group-hover:text-mint sm:size-16 sm:rounded-2xl">
                <Icon className="size-7 stroke-[1.5] sm:size-9" />
              </div>
              <span className="text-center text-xs font-semibold leading-tight sm:text-base">
                {product.name}
              </span>
              <span className="text-xs font-medium text-muted-foreground sm:text-sm">
                {formatCurrency(product.basePrice)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
