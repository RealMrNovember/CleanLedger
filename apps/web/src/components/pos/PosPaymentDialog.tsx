import { useEffect, useState } from "react";
import {
  Banknote,
  CreditCard,
  Printer,
  RotateCcw,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import type { PaymentMethod, PaymentMode } from "@/db/schema";
import { useI18n } from "@/context/I18nContext";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PosPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  subtotal: number;
  discountAmount: number;
  saving: boolean;
  onConfirm: (payload: {
    amountPaid: number;
    paymentMethod: PaymentMethod;
    paymentMode: PaymentMode;
  }) => void;
}

const PAYMENT_MODES: PaymentMode[] = [
  "cash",
  "card",
  "credit",
  "pay_on_delivery",
];

export function PosPaymentDialog({
  open,
  onOpenChange,
  total,
  subtotal,
  discountAmount,
  saving,
  onConfirm,
}: PosPaymentDialogProps) {
  const { t, labels } = useI18n();
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (open) {
      setPaymentMode("cash");
      setPaymentMethod("cash");
      setAmount(String(total > 0 ? total : 0));
    }
  }, [open, total]);

  useEffect(() => {
    if (paymentMode === "card") {
      setPaymentMethod("card");
    } else if (paymentMode === "cash") {
      setPaymentMethod("cash");
    }
  }, [paymentMode]);

  const collectsNow = paymentMode === "cash" || paymentMode === "card";
  const paid = collectsNow
    ? Math.min(Math.max(0, Number(amount.replace(",", ".")) || 0), total)
    : 0;
  const balanceDue = Math.max(0, total - paid);

  const handleConfirm = () => {
    onConfirm({
      amountPaid: paid,
      paymentMethod,
      paymentMode,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("pos.paymentTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl bg-muted/50 px-4 py-3 text-sm">
            {discountAmount > 0 && (
              <div className="mb-1 flex justify-between text-muted-foreground">
                <span>{t("common.subtotal")}</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="mb-1 flex justify-between text-mint">
                <span>{t("common.discount")}</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex items-end justify-between">
              <span className="font-medium">{t("pos.paymentTotal")}</span>
              <span className="text-2xl font-bold">{formatCurrency(total)}</span>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">{t("pos.paymentMode")}</p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition",
                    paymentMode === mode
                      ? "border-mint bg-mint-light text-[#0f3d3a]"
                      : "border-border/60 hover:border-mint/40"
                  )}
                >
                  {mode === "cash" && <Banknote className="size-4" />}
                  {mode === "card" && <CreditCard className="size-4" />}
                  {mode === "credit" && <Wallet className="size-4" />}
                  {mode === "pay_on_delivery" && <Truck className="size-4" />}
                  {labels.paymentMode[mode]}
                </button>
              ))}
            </div>
          </div>

          {paymentMode === "credit" && (
            <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              {t("pos.paymentCreditHint")}
            </p>
          )}

          {paymentMode === "pay_on_delivery" && (
            <p className="rounded-xl border border-trust/30 bg-trust-light/40 px-3 py-2 text-sm text-trust dark:bg-trust/10">
              {t("pos.paymentDeliveryHint")}
            </p>
          )}

          {collectsNow && (
            <>
              <div>
                <p className="mb-2 text-sm font-medium">{t("pos.paymentMethod")}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["cash", "card"] as PaymentMethod[]).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(method);
                        setPaymentMode(method);
                      }}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                        paymentMethod === method
                          ? "border-mint bg-mint-light text-[#0f3d3a]"
                          : "border-border/60 hover:border-mint/40"
                      )}
                    >
                      {method === "cash" ? (
                        <Banknote className="size-4" />
                      ) : (
                        <CreditCard className="size-4" />
                      )}
                      {labels.paymentMethod[method]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  {t("pos.paymentAmountCollected")}
                </label>
                <Input
                  type="number"
                  min={0}
                  max={total}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-12 text-lg font-semibold"
                />
                {balanceDue > 0 && (
                  <p className="mt-2 text-center text-sm font-semibold text-[#b45309]">
                    {t("pos.paymentToCredit")} {formatCurrency(balanceDue)}
                  </p>
                )}
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => setAmount("0")}
              disabled={!collectsNow}
            >
              <RotateCcw className="size-4" />
              {t("common.reset")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" />
              {t("common.cancel")}
            </Button>
          </div>

          <Button
            type="button"
            variant="accent"
            size="xl"
            className="w-full gap-2"
            disabled={saving || total <= 0}
            onClick={handleConfirm}
          >
            <Printer className="size-5" />
            {saving ? t("common.saving") : t("pos.paymentSaveOrder")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
