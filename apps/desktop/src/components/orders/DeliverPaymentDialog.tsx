import { useEffect, useState } from "react";
import { Banknote, CreditCard, Truck, Wallet } from "lucide-react";
import type { OrderWithMeta, PaymentMethod } from "@/db/schema";
import { completeOrderDelivery } from "@/db/client";
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

interface DeliverPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderWithMeta | null;
  onCompleted: () => void;
}

export function DeliverPaymentDialog({
  open,
  onOpenChange,
  order,
  onCompleted,
}: DeliverPaymentDialogProps) {
  const { t, labels } = useI18n();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && order) {
      setPaymentMethod("cash");
      setAmount(String(order.balanceDue > 0 ? order.balanceDue : 0));
      setError("");
    }
  }, [open, order]);

  const handleDeliverWithPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setError("");

    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      setError(t("orders.addPaymentInvalidAmount"));
      return;
    }
    if (value > order.balanceDue + 0.001) {
      setError(
        t("orders.addPaymentMax", {
          amount: formatCurrency(order.balanceDue),
        })
      );
      return;
    }

    setSaving(true);
    try {
      await completeOrderDelivery(order.id, {
        amount: value,
        paymentMethod,
      });
      onCompleted();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("orders.deliverFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeliverOnCredit = async () => {
    if (!order) return;
    setSaving(true);
    setError("");
    try {
      await completeOrderDelivery(order.id, { leaveOnCredit: true });
      onCompleted();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("orders.deliverFailed"));
    } finally {
      setSaving(false);
    }
  };

  const requiresCollection =
    order?.paymentMode === "pay_on_delivery" && order.balanceDue > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="size-5 text-trust" />
            {t("orders.deliverTitle")}
          </DialogTitle>
        </DialogHeader>
        {order && (
          <div className="space-y-4">
            <div className="rounded-xl bg-muted/60 px-3 py-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("orders.deliverOrder")}</span>
                <span className="font-semibold">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("orders.labelRemaining")}</span>
                <span className="font-semibold text-[#b45309]">
                  {formatCurrency(order.balanceDue)}
                </span>
              </div>
            </div>

            {requiresCollection && (
              <p className="text-sm text-muted-foreground">
                {t("orders.deliverWarning")}
              </p>
            )}

            <form onSubmit={(e) => void handleDeliverWithPayment(e)} className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium">{t("orders.addPaymentType")}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["cash", "card"] as PaymentMethod[]).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
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
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full gap-2" disabled={saving}>
                <Truck className="size-4" />
                {saving ? t("common.saving") : t("orders.deliverCollect")}
              </Button>
            </form>

            {order.balanceDue > 0 && (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                disabled={saving}
                onClick={() => void handleDeliverOnCredit()}
              >
                <Wallet className="size-4" />
                {t("orders.deliverCredit")}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
