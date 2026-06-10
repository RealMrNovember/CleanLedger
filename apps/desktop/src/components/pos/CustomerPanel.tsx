import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Phone,
  CalendarDays,
  Zap,
  AlertTriangle,
  User,
  Users,
  ChevronDown,
  ChevronUp,
  History,
  Search,
} from "lucide-react";
import type { Customer, Order, OrderPriority } from "@/db/schema";
import { ORDER_PRIORITY_LABELS } from "@/db/schema";
import { getCustomers, getCustomerOrdersByPhone } from "@/db/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency, formatCustomerName, cn } from "@/lib/utils";
import { toDateKey, addDaysToDate } from "@/lib/dates";

type CustomerTab = "info" | "history";

interface CustomerPanelProps {
  phone: string;
  firstName: string;
  lastName: string;
  isRegistered: boolean;
  customerId?: number | null;
  creditDebt?: number;
  onPhoneChange: (value: string) => void;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onSelectCustomer: (customer: Customer) => void;
  deliveryDate: string;
  onDeliveryDateChange: (value: string) => void;
  priority: OrderPriority;
  onPriorityChange: (value: OrderPriority) => void;
}

function formatOrderDateTime(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CustomerPanel({
  phone,
  firstName,
  lastName,
  isRegistered,
  customerId,
  creditDebt = 0,
  onPhoneChange,
  onFirstNameChange,
  onLastNameChange,
  onSelectCustomer,
  deliveryDate,
  onDeliveryDateChange,
  priority,
  onPriorityChange,
}: CustomerPanelProps) {
  const today = toDateKey(new Date());
  const tomorrow = toDateKey(addDaysToDate(new Date(), 1));
  const dayAfter = toDateKey(addDaysToDate(new Date(), 3));
  const showDetails = phone.trim().length >= 10;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<CustomerTab>("info");
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!pickerOpen) {
      setPickerQuery("");
      return;
    }
    setPickerLoading(true);
    void getCustomers()
      .then(setCustomers)
      .finally(() => setPickerLoading(false));
  }, [pickerOpen]);

  const filteredCustomers = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const full = formatCustomerName(c).toLowerCase();
      return full.includes(q) || c.phone.includes(q);
    });
  }, [customers, pickerQuery]);

  const loadHistory = useCallback(async () => {
    const trimmed = phone.trim();
    if (trimmed.length < 10) {
      setHistoryOrders([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const { orders } = await getCustomerOrdersByPhone(trimmed);
      setHistoryOrders(orders);
    } finally {
      setHistoryLoading(false);
    }
  }, [phone]);

  useEffect(() => {
    if (showDetails) {
      void loadHistory();
    } else {
      setHistoryOrders([]);
    }
  }, [showDetails, customerId, loadHistory]);

  const handleSelectCustomer = (customer: Customer) => {
    onSelectCustomer(customer);
    setPickerOpen(false);
    setActiveTab("info");
  };

  return (
    <Card className="flex h-full min-h-0 w-full flex-col overflow-hidden border-border/50 bg-white shadow-none dark:border-slate-700 dark:bg-slate-900">
      <CardHeader className="shrink-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground/80">
          <Phone className="size-5 text-mint" />
          Müşteri
        </CardTitle>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4 pt-0">
        <div className="shrink-0 space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Telefon Numarası
          </label>
          <Input
            type="tel"
            inputMode="tel"
            placeholder="05XX XXX XX XX"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            className="h-11 w-full text-base font-medium tracking-wide"
          />
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full gap-2"
            onClick={() => setPickerOpen((v) => !v)}
          >
            <Users className="size-4" />
            Müşteri Seç
            {pickerOpen ? (
              <ChevronUp className="ml-auto size-4" />
            ) : (
              <ChevronDown className="ml-auto size-4" />
            )}
          </Button>
        </div>

        {pickerOpen && (
          <div className="shrink-0 space-y-2 rounded-xl border border-border/60 bg-muted/20 p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                placeholder="Ad, soyad veya telefon..."
                className="h-9 pl-8 text-sm"
              />
            </div>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border/50 bg-background">
              {pickerLoading ? (
                <p className="p-3 text-center text-xs text-muted-foreground">
                  Yükleniyor...
                </p>
              ) : filteredCustomers.length === 0 ? (
                <p className="p-3 text-center text-xs text-muted-foreground">
                  Müşteri bulunamadı.
                </p>
              ) : (
                <ul>
                  {filteredCustomers.map((customer) => (
                    <li key={customer.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectCustomer(customer)}
                        className="flex w-full items-center gap-2 border-b border-border/30 px-3 py-2 text-left text-sm transition hover:bg-mint-light/40 last:border-0"
                      >
                        <User className="size-4 shrink-0 text-trust" />
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {formatCustomerName(customer)}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {customer.phone}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {creditDebt > 0 && (
          <div className="shrink-0 rounded-2xl border-2 border-red-300 bg-red-50 p-3 text-center shadow-sm dark:border-red-900 dark:bg-red-950/40">
            <AlertTriangle className="mx-auto mb-1 size-6 text-red-600" />
            <p className="text-sm font-bold text-red-700 dark:text-red-400">
              Müşterinin {formatCurrency(creditDebt)} Borcu Var!
            </p>
          </div>
        )}

        <div className="shrink-0 space-y-2">
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

        <div className="shrink-0 space-y-2">
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

        {showDetails && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-muted/10">
            <div className="flex shrink-0 border-b border-border/50">
              <button
                type="button"
                onClick={() => setActiveTab("info")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition sm:text-sm",
                  activeTab === "info"
                    ? "border-b-2 border-mint text-[#0f3d3a]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <User className="size-3.5" />
                Bilgiler
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition sm:text-sm",
                  activeTab === "history"
                    ? "border-b-2 border-mint text-[#0f3d3a]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <History className="size-3.5" />
                Geçmiş İşlemler
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {activeTab === "info" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <User className="size-3.5 text-trust" />
                      {isRegistered ? "Müşteri Bilgisi" : "Yeni Müşteri Kaydı"}
                    </label>
                    <Input
                      value={firstName}
                      onChange={(e) => onFirstNameChange(e.target.value)}
                      placeholder="Ad *"
                      className="h-10"
                      required
                    />
                    <Input
                      value={lastName}
                      onChange={(e) => onLastNameChange(e.target.value)}
                      placeholder="Soyad (opsiyonel)"
                      className="h-10"
                    />
                    {isRegistered && firstName && (
                      <p className="text-xs text-mint">
                        Kayıtlı müşteri — bilgileri güncelleyebilirsiniz.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Tüm geçmiş siparişler (salt okunur)
                  </p>
                  {historyLoading ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      Yükleniyor...
                    </p>
                  ) : historyOrders.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      Bu müşteriye ait geçmiş sipariş yok.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {historyOrders.map((order) => (
                        <li
                          key={order.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-background px-2.5 py-2 text-xs"
                        >
                          <span className="min-w-0 truncate text-muted-foreground">
                            {formatOrderDateTime(order.createdAt)}
                          </span>
                          <span className="shrink-0 font-bold text-trust">
                            {formatCurrency(order.totalAmount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
