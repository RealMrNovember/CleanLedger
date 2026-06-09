import { Phone, CalendarDays, Zap, AlertTriangle, User } from "lucide-react";
import type { OrderPriority } from "@/db/schema";
import { ORDER_PRIORITY_LABELS } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency, cn } from "@/lib/utils";
import { toDateKey, addDaysToDate } from "@/lib/dates";

interface CustomerPanelProps {
  phone: string;
  firstName: string;
  lastName: string;
  isRegistered: boolean;
  creditDebt?: number;
  onPhoneChange: (value: string) => void;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  deliveryDate: string;
  onDeliveryDateChange: (value: string) => void;
  priority: OrderPriority;
  onPriorityChange: (value: OrderPriority) => void;
}

export function CustomerPanel({
  phone,
  firstName,
  lastName,
  isRegistered,
  creditDebt = 0,
  onPhoneChange,
  onFirstNameChange,
  onLastNameChange,
  deliveryDate,
  onDeliveryDateChange,
  priority,
  onPriorityChange,
}: CustomerPanelProps) {
  const today = toDateKey(new Date());
  const tomorrow = toDateKey(addDaysToDate(new Date(), 1));
  const dayAfter = toDateKey(addDaysToDate(new Date(), 3));
  const showNameFields = phone.trim().length >= 10;

  return (
    <Card className="h-full border-border/50 bg-card/80 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground/80">
          <Phone className="size-5 text-mint" />
          Müşteri
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {creditDebt > 0 && (
          <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-center shadow-sm">
            <AlertTriangle className="mx-auto mb-2 size-8 text-red-600" />
            <p className="text-lg font-bold text-red-700">
              Müşterinin {formatCurrency(creditDebt)} Borcu Var!
            </p>
            <p className="mt-1 text-xs text-red-600">
              Cari hesapta bekleyen bakiye mevcut.
            </p>
          </div>
        )}

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
        </div>

        {showNameFields && (
          <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="size-4 text-trust" />
              {isRegistered ? "Müşteri Bilgisi" : "Yeni Müşteri Kaydı"}
            </label>
            <div>
              <label className="mb-1 block text-xs font-medium">
                Ad <span className="text-destructive">*</span>
              </label>
              <Input
                value={firstName}
                onChange={(e) => onFirstNameChange(e.target.value)}
                placeholder="Ad"
                className="h-11"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Soyad</label>
              <Input
                value={lastName}
                onChange={(e) => onLastNameChange(e.target.value)}
                placeholder="Soyad (opsiyonel)"
                className="h-11"
              />
            </div>
            {isRegistered && firstName && (
              <p className="text-xs text-mint">
                Kayıtlı müşteri — bilgileri güncelleyebilirsiniz.
              </p>
            )}
          </div>
        )}

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
      </CardContent>
    </Card>
  );
}
