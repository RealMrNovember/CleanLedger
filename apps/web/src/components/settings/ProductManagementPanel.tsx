import { useState } from "react";
import { Plus } from "lucide-react";
import type { Product } from "@/db/schema";
import { SERVICE_LABELS, SERVICE_TYPES } from "@/db/schema";
import { useCatalog } from "@/hooks/useCatalog";
import { getProductIcon, getProductIconLabel } from "@/lib/product-icons";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddProductDialog } from "@/components/settings/AddProductDialog";

export function ProductManagementPanel() {
  const { products, servicePrices, refresh } = useCatalog();
  const [addOpen, setAddOpen] = useState(false);

  const getPrice = (productId: number, serviceType: (typeof SERVICE_TYPES)[number]) => {
    const sp = servicePrices.find(
      (s) => s.productId === productId && s.serviceType === serviceType
    );
    const product = products.find((p) => p.id === productId);
    return sp?.price ?? product?.basePrice ?? 0;
  };

  return (
    <>
      <Card className="mx-auto max-w-5xl">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Ürün Yönetimi</CardTitle>
            <p className="text-sm text-muted-foreground">
              POS kataloğuna ürün ekleyin ve simgelerini seçin.
            </p>
          </div>
          <Button className="gap-2 shrink-0" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Yeni Ürün Ekle
          </Button>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Henüz ürün yok. Yeni ürün ekleyerek başlayın.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  getPrice={getPrice}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddProductDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => void refresh()}
      />
    </>
  );
}

function ProductCard({
  product,
  getPrice,
}: {
  product: Product;
  getPrice: (id: number, st: (typeof SERVICE_TYPES)[number]) => number;
}) {
  const Icon = getProductIcon(product.iconName);

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-mint-light text-mint">
          <Icon className="size-7" />
        </div>
        <div>
          <p className="font-bold">{product.name}</p>
          <p className="text-xs text-muted-foreground">
            {getProductIconLabel(product.iconName)}
          </p>
        </div>
      </div>
      <div className="space-y-1 text-xs">
        {SERVICE_TYPES.map((st) => (
          <div key={st} className="flex justify-between gap-2">
            <span className="text-muted-foreground">{SERVICE_LABELS[st]}</span>
            <span className="font-medium">{formatCurrency(getPrice(product.id, st))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
