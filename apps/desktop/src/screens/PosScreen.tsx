import { useCallback, useEffect, useMemo, useState } from "react";
import type { Product, Order, ServiceType, PaymentMethod, OrderPriority } from "@/db/schema";
import { SERVICE_LABELS } from "@/db/schema";
import {
  createOrder,
  getCustomerByPhone,
  getCustomerCreditDebt,
  getServicePrice,
  upsertCustomerByPhone,
  validateCouponCode,
} from "@/db/client";
import { formatCustomerName } from "@/lib/utils";
import { useCatalog } from "@/hooks/useCatalog";
import { useAuth } from "@/context/AuthContext";
import { toDateKey, addDaysToDate } from "@/lib/dates";
import { CustomerPanel } from "@/components/pos/CustomerPanel";
import { ProductCatalog } from "@/components/pos/ProductCatalog";
import { CartPanel, type CartLine } from "@/components/pos/CartPanel";
import { OrderSuccessDialog } from "@/components/pos/OrderSuccessDialog";
import { PosHeader } from "@/components/pos/PosHeader";
import type { ReceiptData } from "@/components/pos/ReceiptPrintDialog";

let lineCounter = 0;
function newLineKey(): string {
  return `line-${++lineCounter}-${Date.now()}`;
}

export function PosScreen() {
  const { products, loading, refresh } = useCatalog();
  const { user } = useAuth();
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [creditDebt, setCreditDebt] = useState(0);
  const [deliveryDate, setDeliveryDate] = useState(() =>
    toDateKey(addDaysToDate(new Date(), 3))
  );
  const [priority, setPriority] = useState<OrderPriority>("normal");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedOrder, setSavedOrder] = useState<Order | null>(null);
  const [savedReceipt, setSavedReceipt] = useState<ReceiptData | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      const trimmed = phone.trim();
      if (trimmed.length >= 10) {
        const c = await getCustomerByPhone(trimmed);
        if (c) {
          setFirstName(c.name);
          setLastName(c.lastName ?? "");
          setIsRegistered(true);
        } else {
          setFirstName("");
          setLastName("");
          setIsRegistered(false);
        }
        const debt = await getCustomerCreditDebt(trimmed);
        setCreditDebt(debt);
      } else {
        setFirstName("");
        setLastName("");
        setIsRegistered(false);
        setCreditDebt(0);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [phone]);

  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.subtotal, 0),
    [cart]
  );

  const total = useMemo(
    () => Math.max(0, subtotal - discountAmount),
    [subtotal, discountAmount]
  );

  const balanceDue = useMemo(
    () => Math.max(0, total - Math.min(amountPaid, total)),
    [total, amountPaid]
  );

  useEffect(() => {
    if (cart.length === 0) {
      setAmountPaid(0);
      return;
    }
    setAmountPaid((prev) => (prev === 0 || prev > total ? total : prev));
  }, [total, cart.length]);

  useEffect(() => {
    if (!appliedCouponCode) return;
    void validateCouponCode(appliedCouponCode, subtotal).then((result) => {
      if (result) {
        setDiscountAmount(result.discount);
      } else {
        setAppliedCouponCode(null);
        setDiscountAmount(0);
        setCouponMessage("");
      }
    });
  }, [subtotal, appliedCouponCode]);

  const handleSelectProduct = useCallback(async (product: Product) => {
    const serviceType: ServiceType = "dry_clean";
    const lineSubtotal = await getServicePrice(product.id, serviceType);
    setCart((prev) => [
      ...prev,
      { key: newLineKey(), product, serviceType, subtotal: lineSubtotal },
    ]);
  }, []);

  const handleServiceChange = useCallback(
    async (key: string, serviceType: ServiceType) => {
      const updated = await Promise.all(
        cart.map(async (line) => {
          if (line.key !== key) return line;
          const lineSubtotal = await getServicePrice(line.product.id, serviceType);
          return { ...line, serviceType, subtotal: lineSubtotal };
        })
      );
      setCart(updated);
    },
    [cart]
  );

  const handleRemove = useCallback((key: string) => {
    setCart((prev) => prev.filter((line) => line.key !== key));
  }, []);

  const handleApplyCoupon = useCallback(async () => {
    const result = await validateCouponCode(couponCode, subtotal);
    if (!result) {
      setCouponMessage("Geçersiz veya süresi dolmuş kupon.");
      setAppliedCouponCode(null);
      setDiscountAmount(0);
      return;
    }
    setAppliedCouponCode(result.coupon.code);
    setDiscountAmount(result.discount);
    setCouponMessage(
      `${result.coupon.code} uygulandı: -${result.discount.toLocaleString("tr-TR")} TL`
    );
  }, [couponCode, subtotal]);

  const handleSave = useCallback(async () => {
    if (cart.length === 0) return;
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      alert("Lütfen müşteri telefon numarasını girin.");
      return;
    }
    if (!firstName.trim()) {
      alert("Lütfen müşteri adını girin.");
      return;
    }

    setSaving(true);
    try {
      const customer = await upsertCustomerByPhone(
        trimmedPhone,
        firstName.trim(),
        lastName.trim()
      );
      const fullName = customer
        ? formatCustomerName(customer)
        : [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
      const paid = Math.min(Math.max(0, amountPaid), total);
      const { order } = await createOrder({
        customerPhone: trimmedPhone,
        customerId: customer?.id ?? null,
        amountPaid: paid,
        paymentMethod,
        couponCode: appliedCouponCode,
        discountAmount,
        deliveryDate,
        priority,
        items: cart.map((line) => ({
          productId: line.product.id,
          serviceType: line.serviceType,
          subtotal: line.subtotal,
        })),
      });
      setSavedOrder(order);
      setSavedReceipt({
        order,
        companyName: user?.companyName ?? "CleanLedger",
        customerPhone: trimmedPhone,
        customerName: fullName,
        lines: cart.map((line) => ({
          productName: line.product.name,
          serviceLabel: SERVICE_LABELS[line.serviceType],
          unitPrice: line.subtotal,
        })),
        discountAmount,
        amountPaid: paid,
        balanceDue: order.balanceDue,
        shopContact: {
          companyName: user?.companyName ?? "CleanLedger",
          phone: user?.phone,
          email: user?.email,
        },
      });
      setShowSuccess(true);
      await refresh();
    } catch (err) {
      console.error(err);
      alert("Sipariş kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  }, [
    cart,
    phone,
    firstName,
    lastName,
    amountPaid,
    paymentMethod,
    appliedCouponCode,
    discountAmount,
    deliveryDate,
    priority,
    total,
    refresh,
    user?.companyName,
  ]);

  const handleNewOrder = useCallback(() => {
    setCart([]);
    setPhone("");
    setFirstName("");
    setLastName("");
    setIsRegistered(false);
    setCreditDebt(0);
    setDeliveryDate(toDateKey(addDaysToDate(new Date(), 3)));
    setPriority("normal");
    setAmountPaid(0);
    setPaymentMethod("cash");
    setCouponCode("");
    setAppliedCouponCode(null);
    setDiscountAmount(0);
    setCouponMessage("");
    setSavedOrder(null);
    setSavedReceipt(null);
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

      <div className="flex flex-1 flex-col gap-4 overflow-hidden p-3 sm:p-4 xl:grid xl:grid-cols-[minmax(240px,280px)_1fr_minmax(280px,340px)] xl:gap-4">
        <section className="max-h-[42vh] min-h-0 shrink-0 overflow-y-auto xl:max-h-none xl:shrink">
          <CustomerPanel
            phone={phone}
            firstName={firstName}
            lastName={lastName}
            isRegistered={isRegistered}
            creditDebt={creditDebt}
            onPhoneChange={setPhone}
            onFirstNameChange={setFirstName}
            onLastNameChange={setLastName}
            deliveryDate={deliveryDate}
            onDeliveryDateChange={setDeliveryDate}
            priority={priority}
            onPriorityChange={setPriority}
          />
        </section>

        <section className="min-h-[220px] flex-1 overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-3 sm:min-h-[280px] sm:p-4 xl:min-h-0">
          <ProductCatalog products={products} onSelectProduct={handleSelectProduct} />
        </section>

        <section className="max-h-[38vh] min-h-[200px] shrink-0 overflow-hidden sm:max-h-[42vh] xl:max-h-none xl:min-h-0 xl:shrink">
          <CartPanel
            items={cart}
            subtotal={subtotal}
            discountAmount={discountAmount}
            total={total}
            amountPaid={amountPaid}
            paymentMethod={paymentMethod}
            balanceDue={balanceDue}
            couponCode={couponCode}
            couponMessage={couponMessage}
            saving={saving}
            onServiceChange={(key, st) => void handleServiceChange(key, st)}
            onRemove={handleRemove}
            onAmountPaidChange={setAmountPaid}
            onPaymentMethodChange={setPaymentMethod}
            onCouponCodeChange={setCouponCode}
            onApplyCoupon={() => void handleApplyCoupon()}
            onSave={handleSave}
          />
        </section>
      </div>

      <OrderSuccessDialog
        open={showSuccess}
        order={savedOrder}
        receipt={savedReceipt}
        onClose={handleNewOrder}
      />
    </div>
  );
}
