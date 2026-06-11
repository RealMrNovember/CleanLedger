import { useCallback, useEffect, useMemo, useState, type ReactNode, type ComponentType } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  OrderPriority,
  PaymentStatus,
  OrderPayment,
  PaymentMethod,
  ItemStatus,
} from "@/db/schema";
import { useI18n } from "@/context/I18nContext";
import {
  getActiveOrders,
  getDeliveredOrders,
  getOrderDashboardStats,
  getOrderPayments,
  getOrderItemsForOrder,
  refundOrderPayment,
  updateOrderOrderStatus,
  updateOrderItemStatus,
  completeOrderDelivery,
  initDatabase,
} from "@/db/client";
import { useAuth } from "@/context/AuthContext";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { AddPaymentDialog } from "@/components/orders/AddPaymentDialog";
import { DeliverPaymentDialog } from "@/components/orders/DeliverPaymentDialog";
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
import { OrdersSearchBar } from "@/components/orders/OrdersSearchBar";
import { OrderItemStatusSelect } from "@/components/orders/OrderItemStatusSelect";
import { ColorBadgeRow, ColorDot } from "@/components/pos/ColorPickerPopover";
import type { OrderItemDetail } from "@/db/client";
import { getProductColorPalette } from "@/db/client";
import { resolveColorDisplay, type ProductColorPreset } from "@cleanledger/shared";
import {
  filterTrackingOrders,
  type OrderDeliveryFilter,
} from "@cleanledger/shared";

export function OrdersTrackingScreen() {
  const { t, labels, translateProduct, translateColor } = useI18n();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const shopName = user?.companyName ?? "Cicibyte CleanLedger";
  const [activeOrders, setActiveOrders] = useState<OrderWithMeta[]>([]);
  const [deliveredOrders, setDeliveredOrders] = useState<OrderWithMeta[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deliveryFilter, setDeliveryFilter] =
    useState<OrderDeliveryFilter>("active");
  const [stats, setStats] = useState({
    tomorrowDeliveries: 0,
    itemsInShop: 0,
    pendingCollection: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [payments, setPayments] = useState<OrderPayment[]>([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [deliverDialogOpen, setDeliverDialogOpen] = useState(false);
  const [refundingId, setRefundingId] = useState<number | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [reprintLoading, setReprintLoading] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItemDetail[]>([]);
  const [colorPalette, setColorPalette] = useState<ProductColorPreset[]>([]);
  const [itemStatusSaving, setItemStatusSaving] = useState<number | null>(null);

  useEffect(() => {
    const state = location.state as { selectedOrderId?: number } | null;
    if (state?.selectedOrderId) {
      setSelectedId(state.selectedOrderId);
      setDeliveryFilter("all");
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    void getProductColorPalette().then(setColorPalette);
  }, []);

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
      setActiveOrders(active);
      setDeliveredOrders(delivered);
    } finally {
      setLoading(false);
    }
  }, []);

  const orderPool = useMemo(() => {
    if (deliveryFilter === "all") {
      return [...activeOrders, ...deliveredOrders];
    }
    if (deliveryFilter === "delivered") {
      return deliveredOrders;
    }
    return activeOrders;
  }, [activeOrders, deliveredOrders, deliveryFilter]);

  const orders = useMemo(
    () => filterTrackingOrders(orderPool, searchQuery, deliveryFilter),
    [orderPool, searchQuery, deliveryFilter]
  );

  useEffect(() => {
    if (selectedId === null) return;
    if (!orders.some((o) => o.id === selectedId)) {
      setSelectedId(null);
    }
  }, [orders, selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = orders.find((o) => o.id === selectedId);

  useEffect(() => {
    if (!selected) {
      setOrderItems([]);
      return;
    }
    void getOrderItemsForOrder(selected.id).then(setOrderItems);
  }, [selected?.id]);

  useEffect(() => {
    if (!selected) {
      setPayments([]);
      return;
    }
    void getOrderPayments(selected.id).then(setPayments);
  }, [selected?.id, selected?.amountPaid, selected?.balanceDue]);

  const whatsAppForOrder = (order: OrderWithMeta) => {
    const name = order.customerName ?? t("orders.whatsappFallback");
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

  const handleItemStatusChange = async (
    itemId: number,
    status: ItemStatus
  ) => {
    setItemStatusSaving(itemId);
    try {
      await updateOrderItemStatus(itemId, status);
      await load();
      if (selectedId) {
        setOrderItems(await getOrderItemsForOrder(selectedId));
      }
    } finally {
      setItemStatusSaving(null);
    }
  };

  const handleMarkDelivered = async (order: OrderWithMeta) => {
    const needsDeliveryPayment =
      order.paymentMode === "pay_on_delivery" && order.balanceDue > 0;
    if (needsDeliveryPayment) {
      setDeliverDialogOpen(true);
      return;
    }
    await completeOrderDelivery(order.id);
    setSelectedId(null);
    await load();
  };

  const handleRefundPayment = async (paymentId: number) => {
    if (!window.confirm(t("orders.refundConfirm"))) return;
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
    (selected.orderStatus === "ready" || selected.orderStatus === "delivered");

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
      alert(t("orders.receiptFailed"));
    } finally {
      setReprintLoading(false);
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
      <DeliverPaymentDialog
        open={deliverDialogOpen}
        onOpenChange={setDeliverDialogOpen}
        order={selected ?? null}
        onCompleted={() => {
          setSelectedId(null);
          void load();
        }}
      />
      <ReceiptPrintDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        receipt={receiptData}
      />

      <div className="shrink-0 border-b border-border/60 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5">
          <div className="shrink-0">
            <h1 className="text-xl font-bold sm:text-2xl">{t("orders.title")}</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">{t("orders.subtitle")}</p>
          </div>
          <OrdersSearchBar
            query={searchQuery}
            onQueryChange={setSearchQuery}
            deliveryFilter={deliveryFilter}
            onDeliveryFilterChange={setDeliveryFilter}
            resultCount={orders.length}
            className="lg:max-w-xl lg:flex-1"
          />
        </div>
      </div>

      <OrdersResizableStatsLayout
        stats={
          <div className="grid grid-cols-3 gap-1.5 px-2 py-1 sm:gap-2 sm:px-3 sm:py-1.5 md:px-4">
            <StatCard
              icon={CalendarClock}
              label={t("orders.statTomorrow")}
              value={String(stats.tomorrowDeliveries)}
              accent="trust"
            />
            <StatCard
              icon={Package}
              label={t("orders.statInShop")}
              value={String(stats.itemsInShop)}
              accent="mint"
            />
            <StatCard
              icon={Wallet}
              label={t("orders.statPendingPayment")}
              value={formatCurrency(stats.pendingCollection)}
              accent="warm"
            />
          </div>
        }
      >
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
            <p className="text-muted-foreground">{t("common.loading")}</p>
          ) : orders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                {searchQuery.trim()
                  ? t("orders.noSearchMatch")
                  : deliveryFilter === "delivered"
                    ? t("orders.noDelivered")
                    : deliveryFilter === "all"
                      ? t("orders.noActive")
                      : t("orders.noActive")}
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
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-ink">
                        {order.customerName ?? t("common.unnamedCustomer")}
                      </p>
                      {order.priority === "urgent" && (
                        <Badge variant="urgent">{t("common.urgent")}</Badge>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground/80">
                        {order.orderNumber}
                      </span>
                      <span aria-hidden className="text-border">·</span>
                      <span>{order.customerPhone}</span>
                      <WhatsAppButton
                        href={whatsAppForOrder(order)}
                        title={t("orders.whatsappSend")}
                      />
                    </div>
                    {order.itemColors && order.itemColors.length > 0 && (
                      <ColorBadgeRow colors={order.itemColors} className="mt-1.5" />
                    )}
                  </div>
                  <p className="text-lg font-bold text-trust">
                    {formatCurrency(order.totalAmount)}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="status">
                    {labels.orderStatus[order.orderStatus as OrderStatus]}
                  </Badge>
                  {order.itemActiveCount != null &&
                    order.itemActiveCount > 0 &&
                    order.itemReadyCount != null &&
                    order.itemReadyCount > 0 &&
                    order.itemReadyCount < order.itemActiveCount && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                        {t("orders.readyProgress", {
                          ready: String(order.itemReadyCount),
                          total: String(order.itemActiveCount),
                        })}
                      </span>
                    )}
                  {order.itemActiveCount != null &&
                    order.itemActiveCount > 0 &&
                    order.itemReadyCount === order.itemActiveCount &&
                    order.orderStatus !== "delivered" && (
                      <span className="rounded-full bg-mint/20 px-2 py-0.5 text-xs font-semibold text-[#0f3d3a]">
                        {t("orders.allItemsReady")}
                      </span>
                    )}
                  {order.orderStatus === "ready" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleMarkPreparing(order.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-0.5 text-xs font-semibold text-foreground hover:bg-muted/80"
                    >
                      <RotateCcw className="size-3" />
                      {t("orders.markPreparing")}
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
                    {labels.paymentStatus[order.paymentStatus as PaymentStatus]}
                  </Badge>
                  {order.balanceDue > 0 && (
                    <span className="text-xs font-medium text-[#b45309]">
                      {t("orders.remaining")} {formatCurrency(order.balanceDue)}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {t("orders.delivery")}{" "}
                    {parseDateKey(order.deliveryDate).toLocaleDateString("tr-TR")} ·{" "}
                    {t("orders.piecesUnit", { count: String(order.itemCount) })}
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
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-bold">
                        {selected.customerName ?? t("common.unnamedCustomer")}
                      </h2>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground/80">
                          {selected.orderNumber}
                        </span>
                        <span aria-hidden>·</span>
                        <span>{selected.customerPhone}</span>
                        <WhatsAppButton
                          href={whatsAppForOrder(selected)}
                          title={t("orders.whatsappSend")}
                        />
                      </div>
                    </div>
                    {canUndoStatus && (
                      <button
                        type="button"
                        onClick={() => void handleUndoStatus()}
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition hover:border-mint/40 hover:bg-mint-light/40 hover:text-[#0f3d3a]"
                        title={
                          selected.orderStatus === "ready"
                            ? t("orders.revertPreparing")
                            : t("orders.revertReady")
                        }
                      >
                        <Undo2 className="size-4" />
                      </button>
                    )}
                  </div>
                  <div className="my-3 grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2 sm:gap-x-4">
                    <Row label={t("orders.labelAmount")} value={formatCurrency(selected.totalAmount)} />
                    <Row
                      label={t("orders.labelPaid")}
                      value={formatCurrency(selected.amountPaid)}
                    />
                    <Row
                      label={t("orders.labelRemaining")}
                      value={formatCurrency(selected.balanceDue)}
                    />
                    <Row
                      label={t("orders.labelDeliveryDate")}
                      value={parseDateKey(selected.deliveryDate).toLocaleDateString(
                        "tr-TR"
                      )}
                    />
                    <Row
                      label={t("common.status")}
                      value={
                        labels.orderStatus[selected.orderStatus as OrderStatus]
                      }
                    />
                    <Row
                      label={t("orders.labelPayment")}
                      value={
                        labels.paymentStatus[
                          selected.paymentStatus as PaymentStatus
                        ]
                      }
                    />
                    <Row
                      label={t("orders.labelPriority")}
                      value={labels.orderPriority[selected.priority as OrderPriority]}
                    />
                    <Row
                      label={t("orders.labelPieces")}
                      value={t("orders.piecesUnit", { count: String(selected.itemCount) })}
                    />
                  </div>

                  {orderItems.length > 0 && (
                    <div className="mb-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("orders.sectionItems")}
                      </p>
                      <ul className="space-y-1.5">
                        {orderItems.map((item) => {
                          const colorDisplay = resolveColorDisplay(
                            colorPalette,
                            item.color
                          );
                          return (
                            <li
                              key={item.id}
                              className="flex flex-wrap items-center justify-between gap-2 text-sm"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="font-medium">
                                  {translateProduct({
                                    name: item.productName,
                                    iconName: null,
                                  })}
                                  {item.itemNumber ? (
                                    <span className="ml-1.5 font-normal text-muted-foreground">
                                      {item.itemNumber}
                                    </span>
                                  ) : null}
                                </span>
                                {colorDisplay ? (
                                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                                    <ColorDot hex={colorDisplay.hex} size="sm" />
                                    {translateColor(colorDisplay)}
                                  </span>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-1">
                                <OrderItemStatusSelect
                                  value={item.itemStatus as ItemStatus}
                                  disabled={
                                    selected.orderStatus === "delivered" ||
                                    itemStatusSaving === item.id
                                  }
                                  onChange={(status) =>
                                    void handleItemStatusChange(item.id, status)
                                  }
                                />
                                <span className="text-[10px] text-muted-foreground">
                                  {labels.itemStatus[item.itemStatus as ItemStatus]}
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("orders.sectionPayments")}
                    </p>
                    {payments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {t("orders.noPayments")}
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
                                    {t("orders.refund")}
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {labels.paymentMethod[
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
                                title={t("orders.refundDelete")}
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

                {selected.orderStatus !== "delivered" && (
                  <div className="mt-3 shrink-0 space-y-2 border-t border-border/60 bg-card pt-3">
                    <Button
                      className="w-full gap-2"
                      variant="outline"
                      disabled={reprintLoading}
                      onClick={() => void handleReprint()}
                    >
                      <Printer className="size-4" />
                      {reprintLoading ? t("orders.markingPreparing") : t("orders.reprint")}
                    </Button>
                    {selected.balanceDue > 0 && (
                      <Button
                        className="w-full gap-2"
                        variant="outline"
                        onClick={() => setPaymentDialogOpen(true)}
                      >
                        <CreditCard className="size-4" />
                        {t("orders.paymentReceived")}
                      </Button>
                    )}
                    {selected.orderStatus === "preparing" && (
                      <Button
                        className="w-full gap-2"
                        variant="secondary"
                        onClick={() => void handleMarkReady(selected.id)}
                      >
                        <CheckCircle2 className="size-4" />
                        {t("orders.markReady")}
                      </Button>
                    )}
                    {selected.orderStatus === "ready" && (
                      <Button
                        className="w-full gap-2"
                        variant="outline"
                        onClick={() => void handleMarkPreparing(selected.id)}
                      >
                        <RotateCcw className="size-4" />
                        {t("orders.revertPreparing")}
                      </Button>
                    )}
                    {selected.orderStatus !== "delivered" && (
                      <Button
                        className="w-full gap-2"
                        onClick={() => void handleMarkDelivered(selected)}
                      >
                        <Truck className="size-4" />
                        {t("orders.markDelivered")}
                      </Button>
                    )}
                  </div>
                )}
                {selected.orderStatus === "delivered" && (
                  <div className="mt-3 shrink-0 space-y-2 border-t border-border/60 bg-card pt-3">
                    <Button
                      className="w-full gap-2"
                      variant="outline"
                      disabled={reprintLoading}
                      onClick={() => void handleReprint()}
                    >
                      <Printer className="size-4" />
                      {reprintLoading ? t("orders.markingPreparing") : t("orders.reprint")}
                    </Button>
                    <Button
                      className="w-full gap-2"
                      variant="outline"
                      onClick={() => void handleMarkReady(selected.id)}
                    >
                      <RotateCcw className="size-4" />
                      {t("orders.revertReady")}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <p className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                {t("orders.selectOrder")}
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
