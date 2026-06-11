import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  MapPin,
  FileText,
  Pencil,
  History,
  Shield,
  Wallet,
  RotateCcw,
  FileDown,
} from "lucide-react";
import type {
  Customer,
  CustomerTag,
  CreditLedgerEntry,
  CreditLedgerType,
  OrderStatus,
  PaymentStatus,
} from "@/db/schema";
import type { PaymentMethod, ServiceType } from "@/db/schema";
import { useI18n } from "@/context/I18nContext";
import {
  getCustomerById,
  getCustomerHistoryDetails,
  getCustomerTags,
  getCustomerCreditLedger,
  getLastActiveCreditReset,
  resetCustomerCredit,
  undoLastCreditReset,
  updateCustomer,
  initDatabase,
  type CustomerHistoryEntry,
} from "@/db/client";
import { useAuth } from "@/context/AuthContext";
import { CustomerTagBadge } from "@/components/CustomerTagBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatCustomerName, formatDateTime } from "@/lib/utils";
import { parseDateKey } from "@/lib/dates";
import { computeCustomerHistoryAnalytics } from "@cleanledger/shared";
import type { CustomerHistoryExportData } from "@cleanledger/shared";
import { printCustomerHistoryPdf } from "@/lib/customer-history-print";

export function CustomerDetailScreen() {
  const { t, labels, translateProduct, locale, formatError } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const customerId = Number(id);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [history, setHistory] = useState<CustomerHistoryEntry[]>([]);
  const [creditLedger, setCreditLedger] = useState<CreditLedgerEntry[]>([]);
  const [canUndoReset, setCanUndoReset] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [creditBusy, setCreditBusy] = useState(false);
  const [creditError, setCreditError] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    lastName: "",
    phone: "",
    notes: "",
    address: "",
    tagId: 1,
  });

  const load = useCallback(async () => {
    await initDatabase();
    const [c, tagList, entries, ledger, lastReset] = await Promise.all([
      getCustomerById(customerId),
      getCustomerTags(),
      getCustomerHistoryDetails(customerId),
      getCustomerCreditLedger(customerId),
      getLastActiveCreditReset(customerId),
    ]);
    if (!c) {
      navigate("/dashboard/customers");
      return;
    }
    setCustomer(c);
    setTags(tagList);
    setHistory(entries);
    setCreditLedger(ledger);
    setCanUndoReset(!!lastReset);
    setForm({
      name: c.name,
      lastName: c.lastName ?? "",
      phone: c.phone,
      notes: c.notes ?? "",
      address: c.address ?? "",
      tagId: c.tagId ?? 1,
    });
  }, [customerId, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    if (!customer) return;
    const updated = await updateCustomer(customer.id, form);
    setCustomer(updated);
    setEditing(false);
  };

  const handleResetCredit = async () => {
    if (!customer) return;
    setCreditBusy(true);
    setCreditError("");
    try {
      await resetCustomerCredit(customer.id, { actorEmail: user?.email ?? null });
      setResetDialogOpen(false);
      await load();
    } catch (err) {
      setCreditError(err instanceof Error ? err.message : t("customers.resetFailed"));
    } finally {
      setCreditBusy(false);
    }
  };

  const handleUndoReset = async () => {
    if (!customer) return;
    setCreditBusy(true);
    setCreditError("");
    try {
      await undoLastCreditReset(customer.id, user?.email ?? null);
      await load();
    } catch (err) {
      setCreditError(err instanceof Error ? err.message : t("customers.undoFailed"));
    } finally {
      setCreditBusy(false);
    }
  };

  const tag = tags.find((t) => t.id === customer?.tagId);

  const historyAnalyticsInput = useMemo(
    () =>
      history.map((entry) => ({
        order: {
          createdAt: entry.order.createdAt,
          totalAmount: entry.order.totalAmount,
        },
        items: entry.items.map((item) => ({
          productName: item.productName,
          serviceType: item.serviceType,
        })),
      })),
    [history]
  );

  const analyticsAll = useMemo(
    () => computeCustomerHistoryAnalytics(historyAnalyticsInput),
    [historyAnalyticsInput]
  );

  const filteredHistory = useMemo(() => {
    return history.filter((entry) => {
      const day = entry.order.createdAt.slice(0, 10);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      return true;
    });
  }, [history, dateFrom, dateTo]);

  const analyticsFiltered = useMemo(
    () =>
      computeCustomerHistoryAnalytics(historyAnalyticsInput, {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    [historyAnalyticsInput, dateFrom, dateTo]
  );

  const exportData = useMemo((): CustomerHistoryExportData | null => {
    if (!customer) return null;
    const dateRangeLabel =
      dateFrom || dateTo
        ? `${dateFrom || "…"} – ${dateTo || "…"}`
        : t("customers.detailAllTime");
    return {
      companyName: user?.companyName ?? "CleanLedger",
      customerName: formatCustomerName(customer),
      phone: customer.phone,
      generatedAt: new Date().toISOString(),
      dateRangeLabel,
      analytics: dateFrom || dateTo ? analyticsFiltered : analyticsAll,
      entries: filteredHistory.map(({ order, items, payments }) => ({
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        totalAmount: order.totalAmount,
        orderStatusLabel: labels.orderStatus[order.orderStatus as OrderStatus],
        paymentStatusLabel:
          labels.paymentStatus[order.paymentStatus as PaymentStatus],
        deliveryDate: order.deliveryDate,
        balanceDue: order.balanceDue,
        items: items.map((item) => ({
          productName: item.productName,
          serviceLabel: labels.service[item.serviceType as ServiceType],
          subtotal: item.subtotal,
        })),
        payments: payments.map((p) => ({
          createdAt: p.createdAt,
          methodLabel: labels.paymentMethod[p.paymentMethod as PaymentMethod],
          amount: p.amount,
          refunded: Boolean(p.refunded),
        })),
      })),
    };
  }, [
    customer,
    filteredHistory,
    analyticsAll,
    analyticsFiltered,
    dateFrom,
    dateTo,
    user?.companyName,
    labels,
    t,
  ]);

  const handleExportPdf = () => {
    if (!exportData) return;
    try {
      printCustomerHistoryPdf(exportData, locale);
    } catch (err) {
      window.alert(formatError(err));
    }
  };

  if (!customer) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        {t("customers.detailLoading")}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white text-gray-900 dark:bg-slate-900 dark:text-gray-100">
      <div className="shrink-0 flex items-center gap-4 border-b border-border/60 px-4 py-3 sm:px-6 sm:py-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/dashboard/customers">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{formatCustomerName(customer)}</h1>
            <CustomerTagBadge tag={tag} />
          </div>
          <p className="text-sm text-muted-foreground">{customer.phone}</p>
          {customer.creditBalance > 0 && (
            <p className="mt-1 text-sm font-semibold text-red-600">
              {t("customers.detailCreditDebt")} {formatCurrency(customer.creditBalance)}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          className="gap-2"
          disabled={!exportData || filteredHistory.length === 0}
          onClick={handleExportPdf}
        >
          <FileDown className="size-4" />
          {t("common.pdf")}
        </Button>
        <Button variant="outline" onClick={() => setEditing(!editing)} className="gap-2">
          <Pencil className="size-4" />
          {editing ? t("common.cancel") : t("common.edit")}
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto overscroll-contain p-4 sm:gap-6 sm:p-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("customers.detailInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t("common.firstName")}
                />
                <Input
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  placeholder={t("common.lastName")}
                />
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder={t("common.phone")}
                />
                <select
                  value={form.tagId}
                  onChange={(e) =>
                    setForm({ ...form, tagId: Number(e.target.value) })
                  }
                  className="h-11 w-full rounded-xl border-2 border-input px-3 text-sm"
                >
                  {tags.map((tagOption) => (
                    <option key={tagOption.id} value={tagOption.id}>
                      {tagOption.label}
                    </option>
                  ))}
                </select>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder={t("common.address")}
                  className="min-h-[80px] w-full rounded-xl border-2 border-input px-4 py-3 text-sm"
                />
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder={t("common.notes")}
                  className="min-h-[60px] w-full rounded-xl border-2 border-input px-4 py-3 text-sm"
                />
                <Button onClick={() => void handleSave()}>{t("common.save")}</Button>
              </>
            ) : (
              <>
                <InfoRow icon={Phone} label={t("customers.fullName")} value={formatCustomerName(customer)} />
                <InfoRow icon={Phone} label={t("common.phone")} value={customer.phone} />
                <InfoRow icon={MapPin} label={t("common.address")} value={customer.address || t("common.dash")} />
                <InfoRow icon={FileText} label={t("common.notes")} value={customer.notes || t("common.dash")} />
                <InfoRow icon={FileText} label={t("common.tag")} value={tag?.label ?? labels.customerTag.normal} />
                <InfoRow
                  icon={History}
                  label={t("customers.registeredDate")}
                  value={formatDateTime(customer.createdAt)}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("customers.detailSummary")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("customers.detailTotalSpend")}</p>
            <p className="text-3xl font-bold text-trust">
              {formatCurrency(analyticsAll.totalSpent)}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("customers.detailVisits", { count: String(analyticsAll.orderCount) })}
            </p>
            {analyticsAll.firstVisit && (
              <p className="text-sm text-muted-foreground">
                {t("customers.detailFirstVisit")} {formatDateTime(analyticsAll.firstVisit)}
              </p>
            )}
            {analyticsAll.lastVisit && (
              <p className="text-sm text-muted-foreground">
                {t("customers.detailLastVisit")} {formatDateTime(analyticsAll.lastVisit)}
              </p>
            )}
            <div className="flex items-start gap-2 rounded-xl border border-mint/30 bg-mint-light/30 p-3 text-xs text-[#0f3d3a]">
              <Shield className="mt-0.5 size-4 shrink-0" />
              <p>{t("customers.detailPermanence")}</p>
            </div>
          </CardContent>
        </Card>

        {(analyticsAll.topProducts.length > 0 ||
          analyticsAll.topServices.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>{t("customers.detailPreferences")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analyticsAll.topProducts.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("customers.detailProducts")}
                  </p>
                  <ul className="space-y-1 text-sm">
                    {analyticsAll.topProducts.map((row) => (
                      <li
                        key={row.name}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="truncate">{row.name}</span>
                        <span className="shrink-0 font-medium text-muted-foreground">
                          {row.count}×
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {analyticsAll.topServices.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("customers.detailServices")}
                  </p>
                  <ul className="space-y-1 text-sm">
                    {analyticsAll.topServices.map((row) => (
                      <li
                        key={row.serviceType}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="truncate">
                          {labels.service[row.serviceType as ServiceType] ??
                            row.serviceType}
                        </span>
                        <span className="shrink-0 font-medium text-muted-foreground">
                          {row.count}×
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-5 text-trust" />
              {t("customers.detailCreditAccount")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">{t("customers.detailOpenBalance")}</p>
              <p
                className={
                  customer.creditBalance > 0
                    ? "text-3xl font-bold text-red-600"
                    : "text-3xl font-bold text-trust"
                }
              >
                {formatCurrency(customer.creditBalance)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="destructive"
                disabled={customer.creditBalance <= 0 || creditBusy}
                onClick={() => setResetDialogOpen(true)}
              >
                {t("customers.detailResetCredit")}
              </Button>
              {canUndoReset && (
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={creditBusy}
                  onClick={() => void handleUndoReset()}
                >
                  <RotateCcw className="size-4" />
                  {t("customers.detailUndoReset")}
                </Button>
              )}
            </div>

            {creditError && (
              <p className="text-sm text-destructive">{creditError}</p>
            )}

            {creditLedger.length > 0 && (
              <div className="border-t border-border/40 pt-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("customers.detailLedger")}
                </p>
                <ul className="max-h-48 space-y-2 overflow-y-auto text-xs">
                  {creditLedger.slice(0, 20).map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-start justify-between gap-2 rounded-lg bg-muted/40 px-2 py-1.5"
                    >
                      <div>
                        <p className="font-medium">
                          {labels.creditLedger[entry.entryType as CreditLedgerType]}
                        </p>
                        <p className="text-muted-foreground">
                          {formatDateTime(entry.createdAt)}
                          {entry.note ? ` · ${entry.note}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={
                            entry.amount >= 0 ? "font-semibold text-red-600" : "font-semibold text-trust"
                          }
                        >
                          {entry.amount >= 0 ? "+" : ""}
                          {formatCurrency(entry.amount)}
                        </p>
                        <p className="text-muted-foreground">
                          {t("customers.detailBalance")} {formatCurrency(entry.balanceAfter)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="size-5 text-trust" />
              {t("customers.detailHistory")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {t("customers.detailStart")}
                </label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-10 w-auto"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {t("customers.detailEnd")}
                </label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-10 w-auto"
                />
              </div>
              {(dateFrom || dateTo) && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                    }}
                  >
                    {t("customers.detailClearFilter")}
                  </Button>
                  <p className="w-full text-sm text-muted-foreground">
                    Seçili dönem: {analyticsFiltered.orderCount} sipariş ·{" "}
                    {formatCurrency(analyticsFiltered.totalSpent)}
                  </p>
                </>
              )}
            </div>
            {filteredHistory.length === 0 ? (
              <p className="text-muted-foreground">
                {history.length === 0
                  ? t("customers.detailNoOrders")
                  : t("customers.detailNoHistory")}
              </p>
            ) : (
              <div className="relative space-y-4 border-l-2 border-mint/30 pl-6">
                {filteredHistory.map(({ order, items, payments }) => (
                  <div key={order.id} className="relative">
                    <span className="absolute -left-[1.65rem] top-2 size-3 rounded-full bg-mint ring-4 ring-white dark:ring-slate-900" />
                    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-bold">{order.orderNumber}</p>
                          <p className="text-sm font-medium text-trust">
                            {formatDateTime(order.createdAt)}
                          </p>
                        </div>
                        <p className="text-lg font-bold">{formatCurrency(order.totalAmount)}</p>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <Badge>{labels.orderStatus[order.orderStatus as OrderStatus]}</Badge>
                        <Badge>
                          {labels.paymentStatus[order.paymentStatus as PaymentStatus]}
                        </Badge>
                        {order.priority === "urgent" && (
                          <Badge variant="urgent">{t("common.urgent")}</Badge>
                        )}
                      </div>

                      <p className="mt-2 text-xs text-muted-foreground">
                        {t("orders.delivery")}{" "}
                        {parseDateKey(order.deliveryDate).toLocaleDateString("tr-TR")}
                        {order.balanceDue > 0 &&
                          ` · ${t("orders.labelRemaining")}: ${formatCurrency(order.balanceDue)}`}
                      </p>

                      <ul className="mt-3 space-y-1 border-t border-border/40 pt-3 text-sm">
                        {items.map((item) => (
                          <li key={item.id} className="flex justify-between gap-2">
                            <span>
                              {translateProduct({
                                name: item.productName,
                                iconName: null,
                              })}{" "}
                              —{" "}
                              {labels.service[item.serviceType as ServiceType]}
                            </span>
                            <span className="font-medium">
                              {formatCurrency(item.subtotal)}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {payments.length > 0 && (
                        <div className="mt-3 border-t border-border/40 pt-3">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {t("customers.detailPayments")}
                          </p>
                          <ul className="space-y-1 text-xs">
                            {payments.map((p) => (
                              <li key={p.id} className="flex justify-between gap-2">
                                <span>
                                  {formatDateTime(p.createdAt)} ·{" "}
                                  {labels.paymentMethod[p.paymentMethod as PaymentMethod]}
                                  {p.refunded ? ` ${t("customers.detailRefund")}` : ""}
                                </span>
                                <span>{formatCurrency(p.amount)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("customers.resetTitle")}</DialogTitle>
            <DialogDescription>{t("customers.resetDescription")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={creditBusy}
              onClick={() => void handleResetCredit()}
            >
              {creditBusy ? t("customers.resetting") : t("customers.resetConfirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-mint" />
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}

function Badge({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant?: "urgent";
}) {
  return (
    <span
      className={
        variant === "urgent"
          ? "rounded-lg bg-[#fff4e6] px-2 py-0.5 font-semibold text-[#c2410c]"
          : "rounded-lg bg-muted px-2 py-0.5 font-medium text-foreground"
      }
    >
      {children}
    </span>
  );
}
