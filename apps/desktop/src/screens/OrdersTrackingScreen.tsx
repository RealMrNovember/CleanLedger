import { useCallback, useEffect, useState, type ReactNode, type ComponentType } from "react";
import {
  CalendarClock,
  Package,
  Wallet,
  CheckCircle2,
  Truck,
  CreditCard,
  RotateCcw,
  Undo2,
  Trash2,
} from "lucide-react";
import type {
  OrderWithMeta,
  OrderStatus,
  PaymentStatus,
  OrderPayment,
  PaymentMethod,
} from "@/db/schema";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/db/schema";
import {
  getActiveOrders,
  getDeliveredOrders,
  getOrderDashboardStats,
  getOrderPayments,
  refundOrderPayment,
  updateOrderOrderStatus,
  initDatabase,
} from "@/db/client";
import { useAuth } from "@/context/AuthContext";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { AddPaymentDialog } from "@/components/orders/AddPaymentDialog";
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
  const [payments, setPayments] = useState<OrderPayment[]>([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [refundingId, setRefundingId] = useState<number | null>(null);

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

  useEffect(() => {
    if (!selected) {
      setPayments([]);
      return;
    }
    void getOrderPayments(selected.id).then(setPayments);
  }, [selected?.id, selected?.amountPaid, selected?.balanceDue]);

  const whatsAppForOrder = (order: OrderWithMeta) => {
    const name = order.customerName ?? "Müşterimiz";
    const debt = order.balanceDue ?? 0;
    const message =
      debt > 0
        ? buildDebtMessage(name, debt, shopName)
        : buildOrderReadyMessage(name, shopName);
    return buildWhatsAppUrl(order.customerPhone, message);
  };

  const refreshSelectedPayments = async () => {
    if (!selected) return;
    setPayments(await getOrderPayments(selected.id));
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

  const handleRefundPayment = async (paymentId: number) => {
    if (!window.confirm("Bu ödeme kaydını iade etmek istiyor musunuz?")) return;
    setRefundingId(paymentId);
    try {
      await refundOrderPayment(paymentId);
      await load();
      await refreshSelectedPayments();
    } finally {
      setRefundingId(null);
    }
  };

  const canUndoStatus =
    selected &&
    ((tab === "active" && selected.orderStatus === "ready") ||
      (tab === "delivered" && selected.orderStatus === "delivered"));

  const handleUndoStatus = async () => {
    if (!selected) return;
    if (selected.orderStatus === "ready") {
      await handleMarkPreparing(selected.id);
    } else if (selected.orderStatus === "delivered") {
      await handleMarkReady(selected.id);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <AddPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        order={selected ?? null}
        onAdded={load}
      />

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
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="status">
                    {ORDER_STATUS_LABELS[order.orderStatus as OrderStatus]}
                  </Badge>
                  {order.orderStatus === "ready" && tab === "active" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleMarkPreparing(order.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-0.5 text-xs font-semibold text-foreground hover:bg-muted/80"
                    >
                      <RotateCcw className="size-3" />
                      Hazırlanıyor&apos;a Al
                    </button>
                  )}
                  <Badge
                    variant={order.paymentStatus === "paid" ? "paid" : "unpaid"}
                  >
                    {PAYMENT_STATUS_LABELS[order.paymentStatus as PaymentStatus]}
                  </Badge>
                  {order.balanceDue > 0 && (
                    <span className="text-xs font-medium text-[#b45309]">
                      Kalan: {formatCurrency(order.balanceDue)}
                    </span>
                  )}
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
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-bold">{selected.orderNumber}</h2>
                  {canUndoStatus && (
                    <button
                      type="button"
                      onClick={() => void handleUndoStatus()}
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition hover:border-mint/40 hover:bg-mint-light/40 hover:text-[#0f3d3a]"
                      title={
                        selected.orderStatus === "ready"
                          ? "Hazırlanıyor'a geri al"
                          : "Hazır statüsüne geri al"
                      }
                    >
                      <Undo2 className="size-4" />
                    </button>
                  )}
                </div>
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
                    label="Ödenen"
                    value={formatCurrency(selected.amountPaid)}
                  />
                  <Row
                    label="Kalan"
                    value={formatCurrency(selected.balanceDue)}
                  />
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
                    value={selected.priority === "urgent" ? "Acil" : "Normal"}
                  />
                  <Row label="Parça" value={`${selected.itemCount} adet`} />
                </div>

                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Ödeme Geçmişi
                  </p>
                  {payments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Henüz ödeme kaydı yok.
                    </p>
                  ) : (
                    <ul className="max-h-36 space-y-2 overflow-y-auto">
                      {payments.map((payment) => (
                        <li
                          key={payment.id}
                          className={cn(
                            "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm",
                            payment.refunded
                              ? "border-dashed opacity-60"
                              : "border-border/60"
                          )}
                        >
                          <div>
                            <p className="font-medium">
                              {formatCurrency(payment.amount)}
                              {payment.refunded && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  (İade)
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {PAYMENT_METHOD_LABELS[
                                payment.paymentMethod as PaymentMethod
                              ]}{" "}
                              ·{" "}
                              {new Date(payment.createdAt).toLocaleString(
                                "tr-TR"
                              )}
                            </p>
                          </div>
                          {!payment.refunded && (
                            <button
                              type="button"
                              disabled={refundingId === payment.id}
                              onClick={() => void handleRefundPayment(payment.id)}
                              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-destructive transition hover:bg-destructive/10"
                              title="İade / Sil"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {tab === "active" && (
                  <div className="mt-auto space-y-2">
                    {selected.balanceDue > 0 && (
                      <Button
                        className="w-full gap-2"
                        variant="outline"
                        onClick={() => setPaymentDialogOpen(true)}
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
