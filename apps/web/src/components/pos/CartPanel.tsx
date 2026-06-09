import { Trash2, Printer, ShoppingBag, Tag } from "lucide-react";
import type { Product, ServiceType, PaymentMethod } from "@/db/schema";
import { SERVICE_LABELS, PAYMENT_METHOD_LABELS } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProductIcon } from "@/lib/product-icons";
import { cn, formatCurrency } from "@/lib/utils";

export interface CartLine {
  key: string;
  product: Product;
  serviceType: ServiceType;
  subtotal: number;
}

const SERVICE_OPTIONS: ServiceType[] = [
  "dry_clean",
  "iron",
  "wash",
  "stain_removal",
];

interface CartPanelProps {
  items: CartLine[];
  subtotal: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  paymentMethod: PaymentMethod;
  balanceDue: number;
  couponCode: string;
  couponMessage?: string;
  saving: boolean;
  onServiceChange: (key: string, serviceType: ServiceType) => void;
  onRemove: (key: string) => void;
  onAmountPaidChange: (value: number) => void;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onCouponCodeChange: (code: string) => void;
  onApplyCoupon: () => void;
  onSave: () => void;
}

export function CartPanel({
  items,
  subtotal,
  discountAmount,
  total,
  amountPaid,
  paymentMethod,
  balanceDue,
  couponCode,
  couponMessage,
  saving,
  onServiceChange,
  onRemove,
  onAmountPaidChange,
  onPaymentMethodChange,
  onCouponCodeChange,
  onApplyCoupon,
  onSave,
}: CartPanelProps) {
  return (
    <Card className="flex h-full flex-col border-border/50 bg-card/80 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground/80">
          <ShoppingBag className="size-5 text-trust" />
          Adisyon
          {items.length > 0 && (
            <span className="ml-auto rounded-full bg-mint/20 px-2.5 py-0.5 text-sm font-bold text-primary-foreground">
              {items.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden p-5 pt-0">
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/80 bg-muted/30 p-6 text-center">
              <ShoppingBag className="mb-3 size-10 text-muted-foreground/40" />
              <p className="font-medium text-muted-foreground">
                Henüz ürün eklenmedi
              </p>
              <p className="mt-1 text-sm text-muted-foreground/70">
                Ortadaki katalogdan ürün seçin
              </p>
            </div>
          ) : (
            items.map((line) => {
              const Icon = getProductIcon(line.product.iconName);
              return (
                <div
                  key={line.key}
                  className="rounded-2xl border border-border/60 bg-background/60 p-4"
                >
                  <div className="mb-3 flex items-start gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-mint-light text-mint">
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{line.product.name}</p>
                      <p className="text-lg font-bold text-trust">
                        {formatCurrency(line.subtotal)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemove(line.key)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SERVICE_OPTIONS.map((svc) => (
                      <button
                        key={svc}
                        type="button"
                        onClick={() => onServiceChange(line.key, svc)}
                        className={cn(
                          "rounded-xl px-3 py-2 text-xs font-medium transition-all",
                          line.serviceType === svc
                            ? "bg-mint text-primary-foreground shadow-sm"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                      >
                        {SERVICE_LABELS[svc]}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-auto space-y-4 border-t border-border/60 pt-4">
          <div className="flex gap-2">
            <Input
              value={couponCode}
              onChange={(e) => onCouponCodeChange(e.target.value.toUpperCase())}
              placeholder="Kupon kodu"
              className="h-10"
            />
            <Button
              type="button"
              variant="outline"
              className="shrink-0 gap-1"
              onClick={onApplyCoupon}
              disabled={!couponCode.trim()}
            >
              <Tag className="size-4" />
              Uygula
            </Button>
          </div>
          {couponMessage && (
            <p className="text-xs font-medium text-mint">{couponMessage}</p>
          )}

          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Ara Toplam</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-mint">
                <span>İndirim</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex items-end justify-between pt-1">
              <span className="text-base font-medium">Toplam</span>
              <span className="text-3xl font-bold tracking-tight">
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-border/60 bg-muted/30 p-3">
            <label className="text-sm font-medium">Ödenen Tutar</label>
            <Input
              type="number"
              min={0}
              max={total}
              step={1}
              value={amountPaid || ""}
              onChange={(e) =>
                onAmountPaidChange(Math.max(0, Number(e.target.value) || 0))
              }
              className="h-11 text-lg font-semibold"
            />
            <div className="grid grid-cols-2 gap-2">
              {(["cash", "card"] as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => onPaymentMethodChange(method)}
                  className={cn(
                    "rounded-xl py-2.5 text-sm font-semibold transition",
                    paymentMethod === method
                      ? "bg-trust text-white"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  {PAYMENT_METHOD_LABELS[method]}
                </button>
              ))}
            </div>
            {balanceDue > 0 && (
              <p className="text-center text-sm font-semibold text-[#b45309]">
                Cariye aktarılacak: {formatCurrency(balanceDue)}
              </p>
            )}
          </div>

          <Button
            variant="accent"
            size="xl"
            className="w-full gap-3 text-lg"
            disabled={items.length === 0 || saving}
            onClick={onSave}
          >
            <Printer className="size-6" />
            {saving ? "Kaydediliyor..." : "Kaydet & Yazdır"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
