import { useState } from "react";
import type { ServiceType } from "@/db/schema";
import { SERVICE_LABELS, SERVICE_TYPES } from "@/db/schema";
import type { Product } from "@/db/schema";
import { updateServicePrice } from "@/db/client";
import { useCatalog } from "@/hooks/useCatalog";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpSection } from "@/components/settings/HelpSection";

export function SettingsScreen() {
  const { products, servicePrices, refresh } = useCatalog();
  const [tab, setTab] = useState<"prices" | "help">("prices");
  const [saving, setSaving] = useState<string | null>(null);

  const getPrice = (productId: number, serviceType: ServiceType): number => {
    const sp = servicePrices.find(
      (s) => s.productId === productId && s.serviceType === serviceType
    );
    if (sp) return sp.price;
    const product = products.find((p) => p.id === productId);
    return product?.basePrice ?? 0;
  };

  const handlePriceChange = async (
    product: Product,
    serviceType: ServiceType,
    value: string
  ) => {
    const price = Number(value);
    if (!Number.isFinite(price) || price < 0) return;
    const key = `${product.id}-${serviceType}`;
    setSaving(key);
    try {
      await updateServicePrice(product.id, serviceType, price);
      await refresh();
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border/60 px-6 py-4">
        <h1 className="text-2xl font-bold">Ayarlar</h1>
        <p className="text-sm text-muted-foreground">
          Fiyat listesi ve yardım merkezi
        </p>
        <div className="mt-4 flex gap-2">
          <Button
            variant={tab === "prices" ? "default" : "outline"}
            onClick={() => setTab("prices")}
          >
            Fiyat Yönetimi
          </Button>
          <Button
            variant={tab === "help" ? "default" : "outline"}
            onClick={() => setTab("help")}
          >
            Yardım & Destek
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === "prices" ? (
          <Card className="mx-auto max-w-5xl">
            <CardHeader>
              <CardTitle>Ürün Fiyat Tablosu</CardTitle>
              <p className="text-sm text-muted-foreground">
                Değişiklikler POS ekranına anında yansır.
              </p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 pr-4 font-semibold">Ürün</th>
                    {SERVICE_TYPES.map((st) => (
                      <th key={st} className="pb-3 px-2 font-semibold">
                        {SERVICE_LABELS[st]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-border/50">
                      <td className="py-3 pr-4 font-medium">{product.name}</td>
                      {SERVICE_TYPES.map((st) => {
                        const key = `${product.id}-${st}`;
                        return (
                          <td key={st} className="px-2 py-2">
                            <Input
                              type="number"
                              min={0}
                              step={5}
                              defaultValue={getPrice(product.id, st)}
                              onBlur={(e) =>
                                void handlePriceChange(product, st, e.target.value)
                              }
                              className="h-9 w-24 text-center"
                              disabled={saving === key}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4 text-xs text-muted-foreground">
                Taban fiyatlar:{" "}
                {products.map((p) => `${p.name} ${formatCurrency(p.basePrice)}`).join(" · ")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <HelpSection />
        )}
      </div>
    </div>
  );
}
