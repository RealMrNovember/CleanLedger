import { useEffect, useState } from "react";
import { Banknote, CreditCard } from "lucide-react";
import type { OrderWithMeta, PaymentMethod } from "@/db/schema";
import { PAYMENT_METHOD_LABELS } from "@/db/schema";
import { addOrderPayment } from "@/db/client";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderWithMeta | null;
  onAdded: () => void;
}

export function AddPaymentDialog({
  open,
  onOpenChange,
  order,
  onAdded,
}: AddPaymentDialogProps) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setError("");

    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      setError("Geçerli bir tutar girin.");
      return;
    }
    if (value > order.balanceDue + 0.001) {
      setError(`En fazla ${formatCurrency(order.balanceDue)} ödenebilir.`);
      return;
    }

    setSaving(true);
    try {
      await addOrderPayment(order.id, value, paymentMethod);
      onAdded();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ödeme eklenemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ödeme Ekle</DialogTitle>
        </DialogHeader>
        {order && (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="rounded-xl bg-muted/60 px-3 py-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Toplam</span>
                <span className="font-semibold">
                  {formatCurrency(order.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kalan</span>
                <span className="font-semibold text-[#b45309]">
                  {formatCurrency(order.balanceDue)}
                </span>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Ödeme Türü</p>
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
                    {PAYMENT_METHOD_LABELS[method]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Ödenecek Tutar
              </label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Kaydediliyor..." : "Ödeme Ekle"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
