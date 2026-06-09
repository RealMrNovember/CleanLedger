import { Phone, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";

interface CustomerPanelProps {
  phone: string;
  onPhoneChange: (value: string) => void;
  deliveryDate: Date;
}

export function CustomerPanel({
  phone,
  onPhoneChange,
  deliveryDate,
}: CustomerPanelProps) {
  return (
    <Card className="h-full border-border/50 bg-card/80 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground/80">
          <Phone className="size-5 text-mint" />
          Müşteri
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
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

        <div className="rounded-2xl bg-mint-light/60 p-5">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary-foreground/70">
            <CalendarDays className="size-4 text-mint" />
            Teslim Tarihi
          </div>
          <p className="text-2xl font-semibold text-foreground">
            {formatDate(deliveryDate)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Varsayılan: 3 iş günü sonra
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
