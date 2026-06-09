import { Phone, CalendarDays, CreditCard, Zap } from "lucide-react";
import type { PaymentStatus, OrderPriority } from "@/db/schema";
import { PAYMENT_STATUS_LABELS, ORDER_PRIORITY_LABELS } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDate, cn } from "@/lib/utils";
import { toDateKey, addDaysToDate } from "@/lib/dates";

interface CustomerPanelProps {
  phone: string;
  customerName?: string;
  onPhoneChange: (value: string) => void;
  deliveryDate: string;
  onDeliveryDateChange: (value: string) => void;
  priority: OrderPriority;
  onPriorityChange: (value: OrderPriority) => void;
  paymentStatus: PaymentStatus;
  onPaymentStatusChange: (value: PaymentStatus) => void;
}

export function CustomerPanel({
  phone,
  customerName,
  onPhoneChange,
  deliveryDate,
  onDeliveryDateChange,
  priority,
  onPriorityChange,
  paymentStatus,
  onPaymentStatusChange,
}: CustomerPanelProps) {
  const today = toDateKey(new Date());
  const tomorrow = toDateKey(addDaysToDate(new Date(), 1));
  const dayAfter = toDateKey(addDaysToDate(new Date(), 3));

  return (
    <Card className="h-full border-border/50 bg-card/80 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground/80">
          <Phone className="size-5 text-mint" />
          Müşteri
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Telefon Numarası
          </label>
          <Input
            type="tel"
            inputMode="tel"
            placeholder="05XX XXX XX XX"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            className="h-14 text-xl font-medium tracking-wide"
            autoFocus
          />
          {customerName && (
            <p className="mt-2 text-lg font-semibold text-trust">{customerName}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CalendarDays className="size-4 text-mint" />
            Teslim Tarihi
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Bugün", value: today },
              { label: "Yarın", value: tomorrow },
              { label: "+3 Gün", value: dayAfter },
            ].map((opt) => (
              <Button
                key={opt.value}
                type="button"
                variant={deliveryDate === opt.value ? "default" : "outline"}
                size="sm"
                className="h-10 text-xs"
                onClick={() => onDeliveryDateChange(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          <Input
            type="date"
            value={deliveryDate}
            onChange={(e) => onDeliveryDateChange(e.target.value)}
            className="h-11"
          />
          <p className="text-sm font-medium text-foreground">
            {formatDate(new Date(deliveryDate + "T12:00:00"))}
          </p>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Zap className="size-4 text-[#e85d04]" />
            Öncelik
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(["normal", "urgent"] as OrderPriority[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPriorityChange(p)}
                className={cn(
                  "rounded-xl py-3 text-sm font-semibold transition",
                  priority === p
                    ? p === "urgent"
                      ? "bg-gradient-to-r from-[#e85d04] to-[#f48c06] text-white shadow-md ring-2 ring-[#e85d04]/40"
                      : "bg-muted text-foreground ring-2 ring-border"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                )}
              >
                {p === "urgent" ? "ACİL" : ORDER_PRIORITY_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CreditCard className="size-4 text-trust" />
            Ödeme Durumu
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(["paid", "unpaid"] as PaymentStatus[]).map((ps) => (
              <button
                key={ps}
                type="button"
                onClick={() => onPaymentStatusChange(ps)}
                className={cn(
                  "rounded-xl py-3 text-sm font-semibold transition",
                  paymentStatus === ps
                    ? ps === "paid"
                      ? "bg-mint text-[#0f3d3a] shadow-sm"
                      : "bg-[#ffb347]/20 text-[#b45309] ring-2 ring-[#ffb347]/50"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {PAYMENT_STATUS_LABELS[ps]}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
