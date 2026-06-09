import { useCallback, useEffect, useState, type ReactNode, type ComponentType } from "react";
import {
  CalendarClock,
  Package,
  Wallet,
  CheckCircle2,
  Truck,
  CreditCard,
  RotateCcw,
} from "lucide-react";
import type { OrderWithMeta, OrderStatus, PaymentStatus } from "@/db/schema";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/db/schema";
import {
  getActiveOrders,
  getDeliveredOrders,
  getOrderDashboardStats,
  updateOrderOrderStatus,
  updateOrderPaymentStatus,
  initDatabase,
} from "@/db/client";
import { useAuth } from "@/context/AuthContext";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import {
  buildDebtMessage,
  buildOrderReadyMessage,
  buildWhatsAppUrl,
} from "@/lib/whatsapp";
import { formatCurrency, cn } from "@/lib/utils";
import { parseDateKey } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function OrdersTrackingScreen() {
  const { user } = useAuth();
  const shopName = user?.companyName ?? "Cicibyte CleanLedger";
  const [tab, setTab] = useState<"active" | "delivered">("active");
  const [orders, setOrders] = useState<OrderWithMeta[]>([]);
  const [stats, setStats] = useState({
    tomorrowDeliveries: 0,
    itemsInShop: 0,
    pendingCollection: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await initDatabase();
      const [s, active, delivered] = await Promise.all([
        getOrderDashboardStats(),
        getActiveOrders(),
        getDeliveredOrders(),
      ]);
      setStats(s);
      setOrders(tab === "active" ? active : delivered);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = orders.find((o) => o.id === selectedId);

  const whatsAppForOrder = (order: OrderWithMeta) => {
    const name = order.customerName ?? "Müşterimiz";
    const debt = order.balanceDue ?? 0;
    const message =
      debt > 0
        ? buildDebtMessage(name, debt, shopName)
        : order.orderStatus === "ready"
          ? buildOrderReadyMessage(name, shopName)
          : buildOrderReadyMessage(name, shopName);
    return buildWhatsAppUrl(order.customerPhone, message);
  };

  const handleMarkPaid = async (id: number) => {
    await updateOrderPaymentStatus(id, "paid");
    await load();
  };

  const handleMarkReady = async (id: number) => {
    await updateOrderOrderStatus(id, "ready");
    await load();
  };

  const handleMarkPreparing = async (id: number) => {
    await updateOrderOrderStatus(id, "preparing");
    await load();
  };

  const handleMarkDelivered = async (id: number) => {
    await updateOrderOrderStatus(id, "delivered");
    setSelectedId(null);
    await load();
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-border/60 px-6 py-4">
        <h1 className="text-2xl font-bold">Sipariş Takibi</h1>
        <p className="text-sm text-muted-foreground">
          Aktif siparişler, teslimat ve tahsilat yönetimi
        </p>
      </div>

      <div className="grid gap-4 p-6 md:grid-cols-3">
        <StatCard
          icon={CalendarClock}
          label="Yarın Teslim Edilecekler"
          value={String(stats.tomorrowDeliveries)}
          accent="trust"
        />
        <StatCard
          icon={Package}
          label="İçerideki Ürün Sayısı"
          value={String(stats.itemsInShop)}
          accent="mint"
        />
        <StatCard
          icon={Wallet}
          label="Bekleyen Tahsilat"
          value={formatCurrency(stats.pendingCollection)}
          accent="warm"
        />
      </div>

      <div className="flex gap-2 border-b border-border/60 px-6">
        <TabButton active={tab === "active"} onClick={() => setTab("active")}>
          Aktif Siparişler
        </TabButton>
        <TabButton
          active={tab === "delivered"}
          onClick={() => setTab("delivered")}
        >
          Teslim Edilenler
        </TabButton>
      </div>

      <div className="grid flex-1 gap-4 overflow-hidden p-3 sm:p-6 lg:grid-cols-[1fr_360px]">
        <div className="overflow-y-auto space-y-3">
          {loading ? (
            <p className="text-muted-foreground">Yükleniyor...</p>
          ) : orders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                {tab === "active"
                  ? "Aktif sipariş bulunmuyor."
                  : "Henüz teslim edilmiş sipariş yok."}
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => setSelectedId(order.id)}
                className={cn(
                  "w-full rounded-2xl border p-4 text-left transition",
                  selectedId === order.id
                    ? "border-mint bg-mint-light/30 shadow-sm"
                    : "border-border/60 bg-card hover:border-mint/30"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold">{order.orderNumber}</p>
                      {order.priority === "urgent" && (
                        <Badge variant="urgent">ACİL</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        {order.customerName ?? order.customerPhone}
                      </p>
                      <WhatsAppButton
                        href={whatsAppForOrder(order)}
                        title="Müşteriye WhatsApp mesajı gönder"
                      />
                    </div>
                  </div>
                  <p className="text-lg font-bold text-trust">
                    {formatCurrency(order.totalAmount)}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="status">
                    {ORDER_STATUS_LABELS[order.orderStatus as OrderStatus]}
                  </Badge>
                  <Badge
                    variant={order.paymentStatus === "paid" ? "paid" : "unpaid"}
                  >
                    {PAYMENT_STATUS_LABELS[order.paymentStatus as PaymentStatus]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Teslim:{" "}
                    {parseDateKey(order.deliveryDate).toLocaleDateString("tr-TR")} ·{" "}
                    {order.itemCount} parça
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        <Card className="flex flex-col border-border/60">
          <CardContent className="flex flex-1 flex-col p-5">
            {selected ? (
              <>
                <h2 className="text-lg font-bold">{selected.orderNumber}</h2>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">
                    {selected.customerName ?? selected.customerPhone}
                  </p>
                  <WhatsAppButton
                    href={whatsAppForOrder(selected)}
                    title="Müşteriye WhatsApp mesajı gönder"
                  />
                </div>
                <div className="my-4 space-y-2 text-sm">
                  <Row label="Tutar" value={formatCurrency(selected.totalAmount)} />
                  <Row
                    label="Teslim Tarihi"
                    value={parseDateKey(selected.deliveryDate).toLocaleDateString(
                      "tr-TR"
                    )}
                  />
                  <Row
                    label="Durum"
                    value={
                      ORDER_STATUS_LABELS[selected.orderStatus as OrderStatus]
                    }
                  />
                  <Row
                    label="Ödeme"
                    value={
                      PAYMENT_STATUS_LABELS[
                        selected.paymentStatus as PaymentStatus
                      ]
                    }
                  />
                  <Row
                    label="Öncelik"
                    value={
                      selected.priority === "urgent" ? "Acil" : "Normal"
                    }
                  />
                  <Row label="Parça" value={`${selected.itemCount} adet`} />
                </div>
                {tab === "active" && (
                  <div className="mt-auto space-y-2">
                    {selected.paymentStatus === "unpaid" && (
                      <Button
                        className="w-full gap-2"
                        variant="outline"
                        onClick={() => void handleMarkPaid(selected.id)}
                      >
                        <CreditCard className="size-4" />
                        Ödeme Alındı
                      </Button>
                    )}
                    {selected.orderStatus === "preparing" && (
                      <Button
                        className="w-full gap-2"
                        variant="secondary"
                        onClick={() => void handleMarkReady(selected.id)}
                      >
                        <CheckCircle2 className="size-4" />
                        Hazır Olarak İşaretle
                      </Button>
                    )}
                    {selected.orderStatus === "ready" && (
                      <Button
                        className="w-full gap-2"
                        variant="outline"
                        onClick={() => void handleMarkPreparing(selected.id)}
                      >
                        <RotateCcw className="size-4" />
                        Hazırlanıyor&apos;a Geri Al
                      </Button>
                    )}
                    {selected.orderStatus !== "delivered" && (
                      <Button
                        className="w-full gap-2"
                        onClick={() => void handleMarkDelivered(selected.id)}
                      >
                        <Truck className="size-4" />
                        Teslim Edildi
                      </Button>
                    )}
                  </div>
                )}
                {tab === "delivered" && selected.orderStatus === "delivered" && (
                  <div className="mt-auto space-y-2">
                    <Button
                      className="w-full gap-2"
                      variant="outline"
                      onClick={() => void handleMarkReady(selected.id)}
                    >
                      <RotateCcw className="size-4" />
                      Hazır Statüsüne Geri Al
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <p className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                Detay için sipariş seçin
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: "mint" | "trust" | "warm";
}) {
  const colors = {
    mint: "bg-mint-light text-mint",
    trust: "bg-trust-light text-trust",
    warm: "bg-[#fff4e6] text-[#b45309]",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={cn(
            "flex size-12 items-center justify-center rounded-xl",
            colors[accent]
          )}
        >
          <Icon className="size-6" />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border-b-2 px-4 py-3 text-sm font-semibold transition",
        active
          ? "border-mint text-[#0f3d3a]"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function Badge({
  variant,
  children,
}: {
  variant: "status" | "paid" | "unpaid" | "urgent";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "rounded-lg px-2 py-0.5 text-xs font-medium",
        variant === "paid" && "bg-mint-light text-[#0f3d3a]",
        variant === "unpaid" && "bg-[#fff4e6] text-[#b45309]",
        variant === "status" && "bg-trust-light text-trust",
        variant === "urgent" &&
          "bg-gradient-to-r from-[#e85d04] to-[#f48c06] font-bold uppercase tracking-wide text-white shadow-sm"
      )}
    >
      {children}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
