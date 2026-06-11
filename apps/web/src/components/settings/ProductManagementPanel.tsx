import { useState } from "react";
import { Plus } from "lucide-react";
import { useCatalog } from "@/hooks/useCatalog";
import { SERVICE_TYPES } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddProductDialog } from "@/components/settings/AddProductDialog";
import { ProductSortableList } from "@/components/settings/ProductSortableList";
import { useI18n } from "@/context/I18nContext";

export function ProductManagementPanel() {
  const { t } = useI18n();
  const { products, servicePrices, refresh } = useCatalog();
  const [addOpen, setAddOpen] = useState(false);

  const getPrice = (productId: number, serviceType: (typeof SERVICE_TYPES)[number]) => {
    const sp = servicePrices.find(
      (s) => s.productId === productId && s.serviceType === serviceType,
    );
    const product = products.find((p) => p.id === productId);
    return sp?.price ?? product?.basePrice ?? 0;
  };

  return (
    <>
      <Card className="mx-auto max-w-5xl">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t("settings.productsTitle")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("settings.productsHint")}</p>
          </div>
          <Button className="shrink-0 gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            {t("pos.catalogAddProduct")}
          </Button>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {t("settings.productsEmpty")}
            </p>
          ) : (
            <ProductSortableList
              products={products}
              getPrice={getPrice}
              onChanged={refresh}
            />
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
