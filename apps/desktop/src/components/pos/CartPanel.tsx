import { useState } from "react";
import { Trash2, ShoppingBag, Tag, Plus, Wallet, ChevronDown, ChevronUp } from "lucide-react";
import type { Product, ServiceType } from "@/db/schema";
import { SERVICE_LABELS } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductVisual } from "@/components/pos/ProductVisual";
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
  couponCode: string;
  couponMessage?: string;
  onServiceChange: (key: string, serviceType: ServiceType) => void;
  onRemove: (key: string) => void;
  onCouponCodeChange: (code: string) => void;
  onApplyCoupon: () => void;
  onPay: () => void;
  /** Mobilde sticky bar kullanıldığında alt ödeme alanını gizle */
  hideMobileCheckout?: boolean;
}

export function CartPanel({
  items,
  subtotal,
  discountAmount,
  total,
  couponCode,
  couponMessage,
  onServiceChange,
  onRemove,
  onCouponCodeChange,
  onApplyCoupon,
  onPay,
  hideMobileCheckout = false,
}: CartPanelProps) {
  const [couponOpen, setCouponOpen] = useState(false);

  return (
    <Card className="flex h-full w-full flex-col border-border/50 bg-white shadow-none dark:border-slate-700 dark:bg-slate-900">
      <CardHeader className="pb-2 sm:pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
          <ShoppingBag className="size-5 text-trust" />
          Adisyon
          {items.length > 0 && (
            <span className="ml-auto rounded-full bg-mint/20 px-2.5 py-0.5 text-sm font-bold text-primary-foreground">
              {items.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3 pt-0 sm:gap-3 sm:p-5">
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 sm:space-y-3">
          {items.length === 0 ? (
            <div className="flex h-full min-h-[120px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/80 bg-muted/30 p-4 text-center sm:min-h-[160px] sm:p-6">
              <ShoppingBag className="mb-2 size-8 text-muted-foreground/40 sm:mb-3 sm:size-10" />
              <p className="text-sm font-medium text-muted-foreground sm:text-base">
                Henüz ürün eklenmedi
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70 sm:text-sm">
                Katalogdan ürün seçin
              </p>
            </div>
          ) : (
            items.map((line) => (
                <div
                  key={line.key}
                  className="rounded-xl border border-border/60 bg-white/60 p-3 dark:border-slate-700 dark:bg-slate-800/60 sm:rounded-2xl sm:p-4"
                >
                  <div className="mb-2 flex items-start gap-2 sm:mb-3 sm:gap-3">
                    <ProductVisual
                      name={line.product.name}
                      iconName={line.product.iconName}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold sm:text-base">
                        {line.product.name}
                      </p>
                      <p className="text-base font-bold text-trust sm:text-lg">
                        {formatCurrency(line.subtotal)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:text-destructive sm:size-9"
                      onClick={() => onRemove(line.key)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {SERVICE_OPTIONS.map((svc) => (
                      <button
                        key={svc}
                        type="button"
                        onClick={() => onServiceChange(line.key, svc)}
                        className={cn(
                          "rounded-lg px-2 py-1.5 text-[10px] font-medium transition-all sm:rounded-xl sm:px-3 sm:py-2 sm:text-xs",
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
              ))
          )}
        </div>

        <div className="mt-auto shrink-0 space-y-2 border-t border-border/60 pt-2 sm:space-y-3 sm:pt-3">
          <button
            type="button"
            onClick={() => setCouponOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-dashed border-border/60 px-3 py-2 text-sm font-medium text-muted-foreground transition hover:border-mint/40 hover:text-foreground"
          >
            <span className="flex items-center gap-2">
              <Plus className="size-4" />
              Kupon Ekle +
            </span>
            {couponOpen ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </button>

          {couponOpen && (
            <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3 dark:bg-slate-800/50">
              <div className="flex items-center gap-1 text-sm font-medium">
                <Tag className="size-4" />
                Kupon Kodu
              </div>
              <div className="flex gap-2">
                <Input
                  value={couponCode}
                  onChange={(e) =>
                    onCouponCodeChange(e.target.value.toUpperCase())
                  }
                  placeholder="Kupon kodu"
                  className="h-10"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  onClick={onApplyCoupon}
                  disabled={!couponCode.trim()}
                >
                  Uygula
                </Button>
              </div>
              {couponMessage && (
                <p className="text-xs font-medium text-mint">{couponMessage}</p>
              )}
            </div>
          )}

          {discountAmount > 0 && (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Ara Toplam</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-mint">
                <span>İndirim</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            </div>
          )}

          <div
            className={cn(
              "space-y-3",
              hideMobileCheckout && "hidden md:block"
            )}
          >
            <div className="hidden items-end justify-end md:flex">
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Toplam: {formatCurrency(total)}
              </p>
            </div>

            <Button
              variant="accent"
              size="xl"
              className="w-full gap-3 text-lg"
              disabled={items.length === 0}
              onClick={onPay}
            >
              <Wallet className="size-6" />
              Öde
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
