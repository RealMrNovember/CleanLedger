import { useCallback, useEffect, useMemo, useState } from "react";
import type { Product, Order, ServiceType } from "@/db/schema";
import {
  initDatabase,
  getProducts,
  createOrder,
  calculateServicePrice,
} from "@/db/client";
import { addDays } from "@/lib/utils";
import { CustomerPanel } from "@/components/pos/CustomerPanel";
import { ProductCatalog } from "@/components/pos/ProductCatalog";
import { CartPanel, type CartLine } from "@/components/pos/CartPanel";
import { OrderSuccessDialog } from "@/components/pos/OrderSuccessDialog";
import { AppHeader } from "@/components/layout/AppHeader";

let lineCounter = 0;

function newLineKey(): string {
  return `line-${++lineCounter}-${Date.now()}`;
}

export function PosScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedOrder, setSavedOrder] = useState<Order | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const deliveryDate = useMemo(() => addDays(new Date(), 3), []);

  useEffect(() => {
    initDatabase()
      .then(() => getProducts())
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  const total = useMemo(
    () => cart.reduce((sum, line) => sum + line.subtotal, 0),
    [cart]
  );

  const handleSelectProduct = useCallback((product: Product) => {
    const serviceType: ServiceType = "dry_clean";
    const subtotal = calculateServicePrice(product.basePrice, serviceType);
    setCart((prev) => [
      ...prev,
      {
        key: newLineKey(),
        product,
        serviceType,
        subtotal,
      },
    ]);
  }, []);

  const handleServiceChange = useCallback(
    (key: string, serviceType: ServiceType) => {
      setCart((prev) =>
        prev.map((line) => {
          if (line.key !== key) return line;
          return {
            ...line,
            serviceType,
            subtotal: calculateServicePrice(line.product.basePrice, serviceType),
          };
        })
      );
    },
    []
  );

  const handleRemove = useCallback((key: string) => {
    setCart((prev) => prev.filter((line) => line.key !== key));
  }, []);

  const handleSave = useCallback(async () => {
    if (cart.length === 0) return;
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      alert("Lütfen müşteri telefon numarasını girin.");
      return;
    }

    setSaving(true);
    try {
      const { order } = await createOrder({
        customerPhone: trimmedPhone,
        items: cart.map((line) => ({
          productId: line.product.id,
          serviceType: line.serviceType,
          subtotal: line.subtotal,
        })),
      });
      setSavedOrder(order);
      setShowSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Sipariş kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  }, [cart, phone]);

  const handleNewOrder = useCallback(() => {
    setCart([]);
    setPhone("");
    setSavedOrder(null);
    setShowSuccess(false);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-4 border-mint/30 border-t-mint" />
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <AppHeader orderCount={cart.length} total={total} />

      <main className="grid flex-1 gap-4 overflow-hidden p-4 lg:grid-cols-[280px_1fr_340px]">
        <section className="min-h-0 overflow-hidden">
          <CustomerPanel
            phone={phone}
            onPhoneChange={setPhone}
            deliveryDate={deliveryDate}
          />
        </section>

        <section className="min-h-0 overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-4">
          <ProductCatalog
            products={products}
            onSelectProduct={handleSelectProduct}
          />
        </section>

        <section className="min-h-0 overflow-hidden">
          <CartPanel
            items={cart}
            total={total}
            saving={saving}
            onServiceChange={handleServiceChange}
            onRemove={handleRemove}
            onSave={handleSave}
          />
        </section>
      </main>

      <OrderSuccessDialog
        open={showSuccess}
        order={savedOrder}
        onClose={handleNewOrder}
      />
    </div>
  );
}
