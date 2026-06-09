import { useCallback, useEffect, useState, type ReactNode, type ComponentType, type MouseEvent } from "react";
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
  Printer,
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
import { ReceiptPrintDialog } from "@/components/pos/ReceiptPrintDialog";
import type { ReceiptData } from "@/components/pos/ReceiptPrintDialog";
import { buildReceiptDataFromOrder } from "@/lib/order-receipt";
import {
  buildDebtMessage,
  buildOrderReadyMessage,
  buildWhatsAppUrl,
} from "@/lib/whatsapp";
import { formatCurrency, cn } from "@/lib/utils";
import { parseDateKey } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OrdersResizableStatsLayout } from "@/components/orders/OrdersResizableStatsLayout";

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
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [reprintLoading, setReprintLoading] = useState(false);
  const [listReprintId, setListReprintId] = useState<number | null>(null);

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

  const handleReprint = async () => {
    if (!selected) return;
    setReprintLoading(true);
    try {
      const data = await buildReceiptDataFromOrder(
        selected,
        selected.customerName
      );
      setReceiptData(data);
      setReceiptOpen(true);
    } catch {
      alert("Fiş oluşturulamadı.");
    } finally {
      setReprintLoading(false);
    }
  };

  const handleReprintFromList = async (order: OrderWithMeta, e: MouseEvent) => {
    e.stopPropagation();
    setListReprintId(order.id);
    try {
      const data = await buildReceiptDataFromOrder(order, order.customerName);
      setReceiptData(data);
      setReceiptOpen(true);
    } catch {
      alert("Fiş oluşturulamadı.");
    } finally {
      setListReprintId(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white text-gray-900 dark:bg-slate-900 dark:text-gray-100">
      <AddPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        order={selected ?? null}
        onAdded={load}
      />
      <ReceiptPrintDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        receipt={receiptData}
      />

      <div className="shrink-0 border-b border-border/60 px-4 py-3 sm:px-6 sm:py-4">
        <h1 className="text-xl font-bold sm:text-2xl">Sipariş Takibi</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Aktif siparişler, teslimat ve tahsilat yönetimi
        </p>
      </div>

      <OrdersResizableStatsLayout
        stats={
          <div className="grid grid-cols-3 gap-1.5 px-2 py-1 sm:gap-2 sm:px-3 sm:py-1.5 md:px-4">
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
        }
      >
      <div className="flex shrink-0 gap-2 border-b border-border/60 px-4 sm:px-6">
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

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 sm:gap-4 sm:p-4 lg:grid lg:grid-cols-[minmax(0,1fr)_min(100%,380px)] lg:grid-rows-1 lg:p-6">
        <div
          className={cn(
            "min-h-0 overflow-y-auto overscroll-contain",
            selected
              ? "max-h-[38vh] shrink-0 lg:max-h-none lg:shrink lg:flex-1"
              : "flex-1"
          )}
        >
          <div className="space-y-3">
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
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-trust">
                      {formatCurrency(order.totalAmount)}
                    </p>
                    <button
                      type="button"
                      title="Fişi yazdır"
                      disabled={listReprintId === order.id}
                      onClick={(e) => void handleReprintFromList(order, e)}
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition hover:border-mint/40 hover:bg-mint-light/40 hover:text-[#0f3d3a]"
                    >
                      <Printer className="size-4" />
                    </button>
                  </div>
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
                    variant={
                      order.paymentStatus === "paid"
                        ? "paid"
                        : order.paymentStatus === "partial"
                          ? "partial"
                          : "unpaid"
                    }
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
        </div>

        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-border/60 lg:min-h-0 lg:flex-none lg:self-stretch">
          <CardContent className="flex min-h-0 flex-1 flex-col p-4 sm:p-5">
            {selected ? (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
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
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {selected.customerName ?? selected.customerPhone}
                    </p>
                    <WhatsAppButton
                      href={whatsAppForOrder(selected)}
                      title="Müşteriye WhatsApp mesajı gönder"
                    />
                  </div>
                  <div className="my-3 grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2 sm:gap-x-4">
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

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Ödeme Geçmişi
                    </p>
                    {payments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Henüz ödeme kaydı yok.
                      </p>
                    ) : (
                      <ul className="space-y-2">
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
                            <div className="min-w-0">
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
                </div>

                {tab === "active" && (
                  <div className="mt-3 shrink-0 space-y-2 border-t border-border/60 bg-card pt-3">
                    <Button
                      className="w-full gap-2"
                      variant="outline"
                      disabled={reprintLoading}
                      onClick={() => void handleReprint()}
                    >
                      <Printer className="size-4" />
                      {reprintLoading ? "Hazırlanıyor..." : "Fişi Yeniden Yazdır"}
                    </Button>
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
                  <div className="mt-3 shrink-0 space-y-2 border-t border-border/60 bg-card pt-3">
                    <Button
                      className="w-full gap-2"
                      variant="outline"
                      disabled={reprintLoading}
                      onClick={() => void handleReprint()}
                    >
                      <Printer className="size-4" />
                      {reprintLoading ? "Hazırlanıyor..." : "Fişi Yeniden Yazdır"}
                    </Button>
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
      </OrdersResizableStatsLayout>
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
    <Card className="overflow-hidden border-border/60 shadow-none">
      <CardContent className="flex items-center gap-2 p-2 sm:gap-2.5 sm:p-2.5">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg sm:size-9 sm:rounded-xl",
            colors[accent],
          )}
        >
          <Icon className="size-4 sm:size-[18px]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[9px] font-medium leading-tight text-muted-foreground sm:text-[10px]">
            {label}
          </p>
          <p className="truncate text-sm font-bold leading-tight sm:text-base md:text-lg">
            {value}
          </p>
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
  variant: "status" | "paid" | "partial" | "unpaid" | "urgent";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "rounded-lg px-2 py-0.5 text-xs font-medium",
        variant === "paid" && "bg-mint-light text-[#0f3d3a]",
        variant === "partial" && "bg-[#fff4e6] text-[#b45309]",
        variant === "unpaid" && "bg-slate-100 text-slate-700",
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
