import { useState } from "react";
import { Trash2, ShoppingBag, Tag, Plus, Wallet } from "lucide-react";
import type { Product, ServiceType } from "@/db/schema";
import { SERVICE_LABELS } from "@/db/schema";
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
  couponCode: string;
  couponMessage?: string;
  onServiceChange: (key: string, serviceType: ServiceType) => void;
  onRemove: (key: string) => void;
  onCouponCodeChange: (code: string) => void;
  onApplyCoupon: () => void;
  onPay: () => void;
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
}: CartPanelProps) {
  const [couponOpen, setCouponOpen] = useState(false);

  return (
    <Card className="flex h-full w-full flex-col border-border/50 bg-card/80 shadow-none">
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

      <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden p-4 pt-0 sm:p-5">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <div className="flex h-full min-h-[160px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/80 bg-muted/30 p-6 text-center">
              <ShoppingBag className="mb-3 size-10 text-muted-foreground/40" />
              <p className="font-medium text-muted-foreground">
                Henüz ürün eklenmedi
              </p>
              <p className="mt-1 text-sm text-muted-foreground/70">
                Katalogdan ürün seçin
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

        <div className="mt-auto shrink-0 space-y-3 border-t border-border/60 pt-3">
          {!couponOpen ? (
            <button
              type="button"
              onClick={() => setCouponOpen(true)}
              className="flex w-full items-center gap-2 rounded-xl border border-dashed border-border/60 px-3 py-2 text-sm font-medium text-muted-foreground transition hover:border-mint/40 hover:text-foreground"
            >
              <Plus className="size-4" />
              Kupon Ekle
            </button>
          ) : (
            <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-sm font-medium">
                  <Tag className="size-4" />
                  Kupon
                </span>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setCouponOpen(false)}
                >
                  Kapat
                </button>
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

          {(discountAmount > 0 || items.length > 0) && (
            <div className="space-y-1 text-sm">
              {discountAmount > 0 && (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Ara Toplam</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-mint">
                    <span>İndirim</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="rounded-2xl bg-trust-light/60 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-trust">
              Toplam Tutar
            </p>
            <p className="text-3xl font-bold tracking-tight text-foreground">
              {formatCurrency(total)}
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
      </CardContent>
    </Card>
  );
}
