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
import { GeneralSettingsPanel } from "@/components/settings/GeneralSettingsPanel";
import { ProductManagementPanel } from "@/components/settings/ProductManagementPanel";
import { CustomerTagsPanel } from "@/components/settings/CustomerTagsPanel";
import { CouponsPanel } from "@/components/settings/CouponsPanel";

type SettingsTab = "general" | "prices" | "products" | "tags" | "coupons" | "help";

export function SettingsScreen() {
  const { products, servicePrices, refresh } = useCatalog();
  const [tab, setTab] = useState<SettingsTab>("general");
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

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: "general", label: "Genel" },
    { id: "prices", label: "Fiyat Yönetimi" },
    { id: "products", label: "Ürün Yönetimi" },
    { id: "tags", label: "Müşteri Etiketleri" },
    { id: "coupons", label: "Kuponlar" },
    { id: "help", label: "Yardım & Destek" },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border/60 px-6 py-4">
        <h1 className="text-2xl font-bold">Ayarlar</h1>
        <p className="text-sm text-muted-foreground">
          Fiyat listesi, etiketler, kuponlar ve yardım merkezi
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Button
              key={t.id}
              variant={tab === t.id ? "default" : "outline"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {tab === "general" ? (
          <GeneralSettingsPanel />
        ) : tab === "prices" ? (
          <Card className="mx-auto max-w-5xl">
            <CardHeader>
              <div>
                <CardTitle>Ürün Fiyat Tablosu</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Değişiklikler POS ekranına anında yansır. Yeni ürün eklemek için
                  &quot;Ürün Yönetimi&quot; sekmesini kullanın.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left">
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
                      <tr key={product.id} className="border-b border-border/40">
                        <td className="py-3 pr-4 font-medium">{product.name}</td>
                        {SERVICE_TYPES.map((st) => {
                          const key = `${product.id}-${st}`;
                          return (
                            <td key={st} className="px-2 py-3">
                              <Input
                                type="number"
                                min={0}
                                step={1}
                                defaultValue={getPrice(product.id, st)}
                                disabled={saving === key}
                                onBlur={(e) =>
                                  void handlePriceChange(product, st, e.target.value)
                                }
                                className="h-9 w-24"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Taban fiyat: {formatCurrency(products[0]?.basePrice ?? 0)} (ilk ürün)
              </p>
            </CardContent>
          </Card>
        ) : tab === "products" ? (
          <ProductManagementPanel />
        ) : tab === "tags" ? (
          <CustomerTagsPanel />
        ) : tab === "coupons" ? (
          <CouponsPanel />
        ) : (
          <HelpSection />
        )}
      </div>
    </div>
  );
}
