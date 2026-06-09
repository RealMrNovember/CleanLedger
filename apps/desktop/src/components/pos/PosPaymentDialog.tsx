import { useEffect, useState } from "react";
import { Banknote, CreditCard, Printer, RotateCcw, X } from "lucide-react";
import type { PaymentMethod } from "@/db/schema";
import { PAYMENT_METHOD_LABELS } from "@/db/schema";
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
  }) => void;
}

export function PosPaymentDialog({
  open,
  onOpenChange,
  total,
  subtotal,
  discountAmount,
  saving,
  onConfirm,
}: PosPaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (open) {
      setPaymentMethod("cash");
      setAmount(String(total > 0 ? total : 0));
    }
  }, [open, total]);

  const paid = Math.min(
    Math.max(0, Number(amount.replace(",", ".")) || 0),
    total
  );
  const balanceDue = Math.max(0, total - paid);

  const handleConfirm = () => {
    onConfirm({ amountPaid: paid, paymentMethod });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ödeme</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl bg-muted/50 px-4 py-3 text-sm">
            {discountAmount > 0 && (
              <div className="mb-1 flex justify-between text-muted-foreground">
                <span>Ara Toplam</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="mb-1 flex justify-between text-mint">
                <span>İndirim</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex items-end justify-between">
              <span className="font-medium">Toplam Tutar</span>
              <span className="text-2xl font-bold">{formatCurrency(total)}</span>
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
                    "flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition",
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
              max={total}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-12 text-lg font-semibold"
            />
            {balanceDue > 0 && (
              <p className="mt-2 text-center text-sm font-semibold text-[#b45309]">
                Cariye aktarılacak: {formatCurrency(balanceDue)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => setAmount("0")}
            >
              <RotateCcw className="size-4" />
              İade / Sıfırla
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" />
              İptal
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
            {saving ? "Kaydediliyor..." : "Ödeme Ekle & Kaydet"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
