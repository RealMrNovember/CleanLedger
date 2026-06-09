import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Product,
  Order,
  ServiceType,
  PaymentMethod,
  OrderPriority,
  Customer,
} from "@/db/schema";
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
import { getShopProfile, shopProfileToContact } from "@/lib/shop-profile";
import { useCatalog } from "@/hooks/useCatalog";
import { toDateKey, addDaysToDate } from "@/lib/dates";
import { CustomerPanel } from "@/components/pos/CustomerPanel";
import { CustomerPickerDialog } from "@/components/pos/CustomerPickerDialog";
import { ProductCatalog } from "@/components/pos/ProductCatalog";
import { CartPanel, type CartLine } from "@/components/pos/CartPanel";
import { PosPaymentDialog } from "@/components/pos/PosPaymentDialog";
import { OrderSuccessDialog } from "@/components/pos/OrderSuccessDialog";
import { PosHeader } from "@/components/pos/PosHeader";
import type { ReceiptData } from "@/components/pos/ReceiptPrintDialog";

let lineCounter = 0;
function newLineKey(): string {
  return `line-${++lineCounter}-${Date.now()}`;
}

export function PosScreen() {
  const { products, loading, refresh } = useCatalog();
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
  const [couponCode, setCouponCode] = useState("");
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedOrder, setSavedOrder] = useState<Order | null>(null);
  const [savedReceipt, setSavedReceipt] = useState<ReceiptData | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

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

  const handlePickCustomer = useCallback(async (customer: Customer) => {
    setPhone(customer.phone);
    setFirstName(customer.name);
    setLastName(customer.lastName ?? "");
    setIsRegistered(true);
    const debt = await getCustomerCreditDebt(customer.phone);
    setCreditDebt(debt);
  }, []);

  const handleSave = useCallback(
    async (amountPaid: number, paymentMethod: PaymentMethod) => {
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
      const shop = getShopProfile();
      const shopContact = shopProfileToContact(shop);
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
          companyName: shop.companyName,
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
          shopContact,
        });
        setPaymentDialogOpen(false);
        setShowSuccess(true);
        await refresh();
      } catch (err) {
        console.error(err);
        alert("Sipariş kaydedilemedi. Lütfen tekrar deneyin.");
      } finally {
        setSaving(false);
      }
    },
    [
      cart,
      phone,
      firstName,
      lastName,
      appliedCouponCode,
      discountAmount,
      deliveryDate,
      priority,
      total,
      refresh,
    ]
  );

  const handleNewOrder = useCallback(() => {
    setCart([]);
    setPhone("");
    setFirstName("");
    setLastName("");
    setIsRegistered(false);
    setCreditDebt(0);
    setDeliveryDate(toDateKey(addDaysToDate(new Date(), 3)));
    setPriority("normal");
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
      <CustomerPickerDialog
        open={customerPickerOpen}
        onOpenChange={setCustomerPickerOpen}
        onSelect={(c) => void handlePickCustomer(c)}
      />
      <PosPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        total={total}
        subtotal={subtotal}
        discountAmount={discountAmount}
        saving={saving}
        onConfirm={({ amountPaid, paymentMethod }) =>
          void handleSave(amountPaid, paymentMethod)
        }
      />

      <PosHeader orderCount={cart.length} />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 sm:gap-4 sm:p-4 lg:grid lg:grid-cols-[minmax(240px,280px)_1fr_minmax(280px,340px)]">
        <section className="w-full shrink-0 lg:min-h-0 lg:overflow-y-auto">
          <CustomerPanel
            phone={phone}
            firstName={firstName}
            lastName={lastName}
            isRegistered={isRegistered}
            creditDebt={creditDebt}
            onPhoneChange={setPhone}
            onFirstNameChange={setFirstName}
            onLastNameChange={setLastName}
            onPickCustomer={() => setCustomerPickerOpen(true)}
            deliveryDate={deliveryDate}
            onDeliveryDateChange={setDeliveryDate}
            priority={priority}
            onPriorityChange={setPriority}
          />
        </section>

        <section className="flex min-h-[240px] w-full flex-1 flex-col overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-3 sm:min-h-[320px] sm:p-4 lg:min-h-0">
          <ProductCatalog
            products={products}
            onSelectProduct={handleSelectProduct}
            onProductAdded={refresh}
          />
        </section>

        <section className="flex min-h-[280px] w-full shrink-0 flex-col overflow-hidden lg:min-h-0">
          <CartPanel
            items={cart}
            subtotal={subtotal}
            discountAmount={discountAmount}
            total={total}
            couponCode={couponCode}
            couponMessage={couponMessage}
            onServiceChange={(key, st) => void handleServiceChange(key, st)}
            onRemove={handleRemove}
            onCouponCodeChange={setCouponCode}
            onApplyCoupon={() => void handleApplyCoupon()}
            onPay={() => setPaymentDialogOpen(true)}
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
