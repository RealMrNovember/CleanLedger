import { useCallback, useEffect, useMemo, useState } from "react";
import type { Product, Order, ServiceType, PaymentStatus, OrderPriority } from "@/db/schema";
import {
  createOrder,
  getCustomerByPhone,
  getServicePrice,
} from "@/db/client";
import { useCatalog } from "@/hooks/useCatalog";
import { toDateKey, addDaysToDate } from "@/lib/dates";
import { CustomerPanel } from "@/components/pos/CustomerPanel";
import { ProductCatalog } from "@/components/pos/ProductCatalog";
import { CartPanel, type CartLine } from "@/components/pos/CartPanel";
import { OrderSuccessDialog } from "@/components/pos/OrderSuccessDialog";
import { PosHeader } from "@/components/pos/PosHeader";

let lineCounter = 0;
function newLineKey(): string {
  return `line-${++lineCounter}-${Date.now()}`;
}

export function PosScreen() {
  const { products, loading, refresh } = useCatalog();
  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(() =>
    toDateKey(addDaysToDate(new Date(), 3))
  );
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("unpaid");
  const [priority, setPriority] = useState<OrderPriority>("normal");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedOrder, setSavedOrder] = useState<Order | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (phone.trim().length >= 10) {
        const c = await getCustomerByPhone(phone.trim());
        setCustomerName(c?.name ?? "");
      } else {
        setCustomerName("");
      }
    }, 400);
    return () => clearTimeout(t);
  }, [phone]);

  const total = useMemo(
    () => cart.reduce((sum, line) => sum + line.subtotal, 0),
    [cart]
  );

  const handleSelectProduct = useCallback(async (product: Product) => {
    const serviceType: ServiceType = "dry_clean";
    const subtotal = await getServicePrice(product.id, serviceType);
    setCart((prev) => [
      ...prev,
      { key: newLineKey(), product, serviceType, subtotal },
    ]);
  }, []);

  const handleServiceChange = useCallback(
    async (key: string, serviceType: ServiceType) => {
      const updated = await Promise.all(
        cart.map(async (line) => {
          if (line.key !== key) return line;
          const subtotal = await getServicePrice(line.product.id, serviceType);
          return { ...line, serviceType, subtotal };
        })
      );
      setCart(updated);
    },
    [cart]
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
      const existing = await getCustomerByPhone(trimmedPhone);
      const { order } = await createOrder({
        customerPhone: trimmedPhone,
        customerId: existing?.id ?? null,
        paymentStatus,
        deliveryDate,
        priority,
        items: cart.map((line) => ({
          productId: line.product.id,
          serviceType: line.serviceType,
          subtotal: line.subtotal,
        })),
      });
      setSavedOrder(order);
      setShowSuccess(true);
      await refresh();
    } catch (err) {
      console.error(err);
      alert("Sipariş kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  }, [cart, phone, paymentStatus, deliveryDate, priority, refresh]);

  const handleNewOrder = useCallback(() => {
    setCart([]);
    setPhone("");
    setCustomerName("");
    setDeliveryDate(toDateKey(addDaysToDate(new Date(), 3)));
    setPaymentStatus("unpaid");
    setPriority("normal");
    setSavedOrder(null);
    setShowSuccess(false);
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-4 border-mint/30 border-t-mint" />
          <p className="text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PosHeader orderCount={cart.length} total={total} />

      <div className="grid flex-1 gap-4 overflow-hidden p-4 lg:grid-cols-[300px_1fr_340px]">
        <section className="min-h-0 overflow-y-auto">
          <CustomerPanel
            phone={phone}
            customerName={customerName}
            onPhoneChange={setPhone}
            deliveryDate={deliveryDate}
            onDeliveryDateChange={setDeliveryDate}
            priority={priority}
            onPriorityChange={setPriority}
            paymentStatus={paymentStatus}
            onPaymentStatusChange={setPaymentStatus}
          />
        </section>

        <section className="min-h-0 overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-4">
          <ProductCatalog products={products} onSelectProduct={handleSelectProduct} />
        </section>

        <section className="min-h-0 overflow-hidden">
          <CartPanel
            items={cart}
            total={total}
            saving={saving}
            onServiceChange={(key, st) => void handleServiceChange(key, st)}
            onRemove={handleRemove}
            onSave={handleSave}
          />
        </section>
      </div>

      <OrderSuccessDialog
        open={showSuccess}
        order={savedOrder}
        onClose={handleNewOrder}
      />
    </div>
  );
}
