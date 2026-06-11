import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Product,
  Order,
  ServiceType,
  PaymentMethod,
  PaymentMode,
  Customer,
} from "@/db/schema";
import {
  createOrder,
  getCustomerByPhone,
  getCustomerCreditDebt,
  getProductColorPalette,
  getServicePrice,
  upsertCustomerByPhone,
  validateCouponCode,
} from "@/db/client";
import { resolveColorDisplay, type ProductColorPreset } from "@cleanledger/shared";
import { formatCustomerName } from "@/lib/utils";
import { getShopProfile, shopProfileToContact } from "@/lib/shop-profile";
import { useCatalog } from "@/hooks/useCatalog";
import { CustomerPanel } from "@/components/pos/CustomerPanel";
import { ProductCatalog } from "@/components/pos/ProductCatalog";
import { CartPanel } from "@/components/pos/CartPanel";
import { PosPaymentDialog } from "@/components/pos/PosPaymentDialog";
import { PosStickyBar } from "@/components/pos/PosStickyBar";
import { PosResizableLayout } from "@/components/pos/PosResizableLayout";
import { OrderSuccessDialog } from "@/components/pos/OrderSuccessDialog";
import type { ReceiptData } from "@/components/pos/ReceiptPrintDialog";
import { usePosDraft } from "@/context/PosDraftContext";
import { useI18n } from "@/context/I18nContext";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

let lineCounter = 0;
function newLineKey(): string {
  return `line-${++lineCounter}-${Date.now()}`;
}

export function PosScreen() {
  const { t, labels } = useI18n();
  const { products, loading, refresh } = useCatalog();
  const {
    phone,
    firstName,
    lastName,
    isRegistered,
    deliveryDate,
    priority,
    cart,
    couponCode,
    appliedCouponCode,
    discountAmount,
    couponMessage,
    setPhone,
    setFirstName,
    setLastName,
    setIsRegistered,
    setDeliveryDate,
    setPriority,
    setCart,
    setCouponCode,
    setAppliedCouponCode,
    setDiscountAmount,
    setCouponMessage,
    clearDraft,
    hasDraft,
  } = usePosDraft();
  const [creditDebt, setCreditDebt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedOrder, setSavedOrder] = useState<Order | null>(null);
  const [savedReceipt, setSavedReceipt] = useState<ReceiptData | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [colorPalette, setColorPalette] = useState<ProductColorPreset[]>([]);

  useEffect(() => {
    void getProductColorPalette().then(setColorPalette);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
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
    return () => clearTimeout(timer);
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
    const catalogPrice = await getServicePrice(product.id, serviceType);
    setCart((prev) => [
      ...prev,
      {
        key: newLineKey(),
        product,
        serviceType,
        originalPrice: catalogPrice,
        salePrice: catalogPrice,
        subtotal: catalogPrice,
        color: null,
      },
    ]);
  }, []);

  const handleServiceChange = useCallback(
    async (key: string, serviceType: ServiceType) => {
      const updated = await Promise.all(
        cart.map(async (line) => {
          if (line.key !== key) return line;
          const catalogPrice = await getServicePrice(line.product.id, serviceType);
          return {
            ...line,
            serviceType,
            originalPrice: catalogPrice,
            salePrice: catalogPrice,
            subtotal: catalogPrice,
          };
        })
      );
      setCart(updated);
    },
    [cart]
  );

  const handlePriceChange = useCallback((key: string, salePrice: number) => {
    setCart((prev) =>
      prev.map((line) =>
        line.key === key
          ? { ...line, salePrice, subtotal: salePrice }
          : line
      )
    );
  }, []);

  const handleColorChange = useCallback((key: string, color: string | null) => {
    setCart((prev) =>
      prev.map((line) => (line.key === key ? { ...line, color } : line))
    );
  }, []);

  const handleRemove = useCallback((key: string) => {
    setCart((prev) => prev.filter((line) => line.key !== key));
  }, []);

  const handleApplyCoupon = useCallback(async () => {
    const result = await validateCouponCode(couponCode, subtotal);
    if (!result) {
      setCouponMessage(t("pos.couponInvalid"));
      setAppliedCouponCode(null);
      setDiscountAmount(0);
      return;
    }
    setAppliedCouponCode(result.coupon.code);
    setDiscountAmount(result.discount);
    setCouponMessage(
      t("pos.couponApplied", {
        code: result.coupon.code,
        amount: result.discount.toLocaleString("tr-TR"),
      })
    );
  }, [couponCode, subtotal, t]);

  const handlePickCustomer = useCallback(async (customer: Customer) => {
    setPhone(customer.phone);
    setFirstName(customer.name);
    setLastName(customer.lastName ?? "");
    setIsRegistered(true);
    const debt = await getCustomerCreditDebt(customer.phone);
    setCreditDebt(debt);
  }, []);

  const handleSave = useCallback(
    async (
      amountPaid: number,
      paymentMethod: PaymentMethod,
      paymentMode: PaymentMode
    ) => {
      if (cart.length === 0) return;
      const trimmedPhone = phone.trim();
      if (!trimmedPhone) {
        alert(t("pos.errorPhoneRequired"));
        return;
      }
      if (!firstName.trim()) {
        alert(t("pos.errorNameRequired"));
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
        const paid =
          paymentMode === "credit" || paymentMode === "pay_on_delivery"
            ? 0
            : Math.min(Math.max(0, amountPaid), total);
        const shop = getShopProfile();
        const shopContact = shopProfileToContact(shop);
        const { order } = await createOrder({
          customerPhone: trimmedPhone,
          customerId: customer?.id ?? null,
          amountPaid: paid,
          paymentMethod,
          paymentMode,
          couponCode: appliedCouponCode,
          discountAmount,
          deliveryDate,
          priority,
          items: cart.map((line) => ({
            productId: line.product.id,
            serviceType: line.serviceType,
            subtotal: line.subtotal,
            originalPrice: line.originalPrice,
            salePrice: line.salePrice,
            color: line.color ?? null,
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
            serviceLabel: labels.service[line.serviceType],
            unitPrice: line.salePrice,
            originalPrice: line.originalPrice,
            colorLabel: line.color
              ? resolveColorDisplay(colorPalette, line.color)?.label
              : undefined,
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
        alert(t("pos.errorSaveFailed"));
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
      colorPalette,
      labels,
      t,
    ]
  );

  const handleNewOrder = useCallback(() => {
    clearDraft();
    setSavedOrder(null);
    setSavedReceipt(null);
    setShowSuccess(false);
  }, [clearDraft]);

  const handleDiscardDraft = useCallback(() => {
    if (
      !confirm(t("pos.draftDiscardConfirm"))
    ) {
      return;
    }
    handleNewOrder();
  }, [handleNewOrder, t]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center">
          <div className="mx-auto mb-4 size-10 animate-spin rounded-full border-4 border-mint/30 border-t-mint" />
          <p className="text-muted-foreground">{t("pos.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white text-gray-900 dark:bg-slate-900 dark:text-gray-100">
      {hasDraft && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-mint/30 bg-mint-light/40 px-3 py-2 sm:px-4">
          <p className="text-sm font-medium text-[#0f3d3a]">
            {t("pos.draftBanner")}
            {cart.length > 0 && (
              <span className="ml-2 text-muted-foreground">
                · {t("pos.draftItemCount", { count: String(cart.length) })}
              </span>
            )}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleDiscardDraft}
          >
            <XCircle className="size-4" />
            {t("pos.draftDiscard")}
          </Button>
        </div>
      )}
      <PosPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        total={total}
        subtotal={subtotal}
        discountAmount={discountAmount}
        saving={saving}
        onConfirm={({ amountPaid, paymentMethod, paymentMode }) =>
          void handleSave(amountPaid, paymentMethod, paymentMode)
        }
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 pb-24 sm:p-4 md:pb-4">
        <PosResizableLayout
          customer={
            <CustomerPanel
              phone={phone}
              firstName={firstName}
              lastName={lastName}
              isRegistered={isRegistered}
              creditDebt={creditDebt}
              onPhoneChange={setPhone}
              onFirstNameChange={setFirstName}
              onLastNameChange={setLastName}
              onSelectCustomer={(c) => void handlePickCustomer(c)}
              deliveryDate={deliveryDate}
              onDeliveryDateChange={setDeliveryDate}
              priority={priority}
              onPriorityChange={setPriority}
            />
          }
          catalog={
            <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/50 bg-white p-2 dark:border-slate-700 dark:bg-slate-900 sm:p-3">
              <ProductCatalog
                products={products}
                onSelectProduct={handleSelectProduct}
                onProductAdded={refresh}
              />
            </section>
          }
          cart={
            <CartPanel
              items={cart}
              colorPalette={colorPalette}
              subtotal={subtotal}
              discountAmount={discountAmount}
              total={total}
              couponCode={couponCode}
              couponMessage={couponMessage}
              onServiceChange={(key, st) => void handleServiceChange(key, st)}
              onPriceChange={handlePriceChange}
              onColorChange={handleColorChange}
              onRemove={handleRemove}
              onCouponCodeChange={setCouponCode}
              onApplyCoupon={() => void handleApplyCoupon()}
              onPay={() => setPaymentDialogOpen(true)}
              hideMobileCheckout
            />
          }
        />
      </div>

      <PosStickyBar
        total={total}
        itemCount={cart.length}
        disabled={cart.length === 0}
        onPay={() => setPaymentDialogOpen(true)}
      />

      <OrderSuccessDialog
        open={showSuccess}
        order={savedOrder}
        receipt={savedReceipt}
        onClose={handleNewOrder}
      />
    </div>
  );
}
