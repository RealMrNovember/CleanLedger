import { useCallback, useEffect, useMemo, useState } from "react";
import { FileDown, BarChart3, CalendarRange } from "lucide-react";
import {
  getCustomersReportRows,
  getOrderWorkReportRows,
  getRevenueReportSummary,
  resolveReportDateRange,
  type CustomerReportRow,
  type OrderWorkReportRow,
  type ReportPeriod,
  type ReportType,
  type RevenueReportSummary,
} from "@/db/client";
import { useAuth } from "@/context/AuthContext";
import { ReportPrintView } from "@/components/reports/ReportPrintView";
import { triggerReportPrint } from "@/lib/report-print";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import {
  hasLinePriceAdjustment,
  linePriceCatalogTotal,
} from "@cleanledger/shared/reports";
import type { OrderStatus, PaymentStatus, ServiceType } from "@/db/schema";
import { useI18n } from "@/context/I18nContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ReportsScreen() {
  const { t, labels } = useI18n();

  const periodOptions: { value: ReportPeriod; label: string }[] = useMemo(
    () => [
      { value: "daily", label: t("reports.periodDaily") },
      { value: "weekly", label: t("reports.periodWeekly") },
      { value: "monthly", label: t("reports.periodMonthly") },
    ],
    [t]
  );

  const typeOptions: { value: ReportType; label: string; desc: string }[] =
    useMemo(
      () => [
        {
          value: "revenue",
          label: t("reports.typeRevenueFull"),
          desc: t("reports.typeRevenueFullDesc"),
        },
        {
          value: "customers",
          label: t("reports.typeCustomers"),
          desc: t("reports.typeCustomersDesc"),
        },
        {
          value: "orders",
          label: t("reports.typeOrders"),
          desc: t("reports.typeOrdersDesc"),
        },
      ],
      [t]
    );
  const { user } = useAuth();
  const companyName = user?.companyName ?? "CleanLedger";
  const [period, setPeriod] = useState<ReportPeriod>("daily");
  const [reportType, setReportType] = useState<ReportType>("revenue");
  const [anchorDate, setAnchorDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState<RevenueReportSummary | null>(null);
  const [customers, setCustomers] = useState<CustomerReportRow[]>([]);
  const [orders, setOrders] = useState<OrderWorkReportRow[]>([]);

  const range = useMemo(
    () => resolveReportDateRange(period, new Date(anchorDate + "T12:00:00")),
    [period, anchorDate]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (reportType === "revenue") {
        setRevenue(await getRevenueReportSummary(range));
      } else if (reportType === "customers") {
        setCustomers(await getCustomersReportRows(range));
      } else {
        setOrders(await getOrderWorkReportRows(range));
      }
    } finally {
      setLoading(false);
    }
  }, [range, reportType]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white text-gray-900 dark:bg-slate-900 dark:text-gray-100">
      <div className="shrink-0 border-b border-border/60 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <BarChart3 className="size-7 text-trust" />
              {t("reports.title")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("reports.subtitle")}</p>
          </div>
          <Button className="gap-2 print:hidden" onClick={triggerReportPrint}>
            <FileDown className="size-4" />
            {t("reports.print")}
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 sm:p-6 lg:grid-cols-[280px_1fr]">
        <Card className="min-h-0 overflow-y-auto print:hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("reports.settingsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium">
                {t("reports.periodLabel")}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {periodOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPeriod(opt.value)}
                    className={cn(
                      "rounded-xl py-2 text-sm font-medium transition",
                      period === opt.value
                        ? "bg-mint text-[#0f3d3a] shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                <CalendarRange className="size-4" />
                {t("reports.anchorDate")}
              </label>
              <Input
                type="date"
                value={anchorDate}
                onChange={(e) => setAnchorDate(e.target.value)}
              />
              <p className="mt-2 text-xs text-muted-foreground">{range.label}</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                {t("reports.typeLabel")}
              </label>
              <div className="space-y-2">
                {typeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setReportType(opt.value)}
                    className={cn(
                      "w-full rounded-xl border px-3 py-3 text-left transition",
                      reportType === opt.value
                        ? "border-mint bg-mint-light/40"
                        : "border-border/60 hover:border-mint/30"
                    )}
                  >
                    <p className="font-semibold">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden print:hidden">
          <CardHeader className="shrink-0">
            <CardTitle>
              {typeOptions.find((o) => o.value === reportType)?.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {loading ? (
              <p className="text-muted-foreground">{t("reports.loading")}</p>
            ) : reportType === "revenue" && revenue ? (
              <RevenuePreview summary={revenue} />
            ) : reportType === "customers" ? (
              <CustomersPreview rows={customers} />
            ) : (
              <OrdersPreview rows={orders} labels={labels} />
            )}
          </CardContent>
        </Card>
      </div>

      <ReportPrintView
        companyName={companyName}
        reportType={reportType}
        range={range}
        revenue={revenue ?? undefined}
        customers={customers}
        orders={orders}
      />
    </div>
  );
}

function RevenuePreview({ summary }: { summary: RevenueReportSummary }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Stat label={t("reports.statOrders")} value={String(summary.orderCount)} />
      <Stat label={t("reports.netRevenue")} value={formatCurrency(summary.netRevenue)} accent />
      <Stat label={t("reports.collected")} value={formatCurrency(summary.collected)} />
      <Stat label={t("reports.outstanding")} value={formatCurrency(summary.outstanding)} />
      <Stat label={t("reports.couponDiscounts")} value={formatCurrency(summary.totalDiscounts)} />
      <Stat label={t("reports.grossRevenue")} value={formatCurrency(summary.grossSubtotal)} />
      <Stat
        label={t("reports.catalogTotal")}
        value={formatCurrency(summary.catalogSubtotal)}
      />
      <Stat
        label={t("reports.lineDiscount")}
        value={formatCurrency(summary.linePriceAdjustments)}
      />
      {summary.adjustedLineCount > 0 && (
        <Stat
          label={t("reports.discountedLines")}
          value={String(summary.adjustedLineCount)}
        />
      )}
    </div>
  );
}

function CustomersPreview({ rows }: { rows: CustomerReportRow[] }) {
  const { t } = useI18n();
  if (rows.length === 0) {
    return <p className="text-muted-foreground">{t("reports.noCustomerVisits")}</p>;
  }
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div
          key={row.phone}
          className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3"
        >
          <div>
            <p className="font-semibold">{row.customerName}</p>
            <p className="text-xs text-muted-foreground">
              {t("reports.visitMeta", {
                phone: row.phone,
                count: String(row.visitCount),
                date: formatDateTime(row.lastVisitAt),
              })}
            </p>
          </div>
          <p className="font-bold text-trust">{formatCurrency(row.totalSpent)}</p>
        </div>
      ))}
    </div>
  );
}

function OrdersPreview({
  rows,
  labels,
}: {
  rows: OrderWorkReportRow[];
  labels: ReturnType<typeof useI18n>["labels"];
}) {
  const { t, translateProduct } = useI18n();
  if (rows.length === 0) {
    return <p className="text-muted-foreground">{t("reports.noOrdersInPeriod")}</p>;
  }
  return (
    <div className="space-y-3">
      {rows.map(({ order, customerName, items }) => (
        <div key={order.id} className="rounded-xl border border-border/60 p-4">
          <div className="flex justify-between gap-2">
            <p className="font-bold">{order.orderNumber}</p>
            <p className="font-bold text-trust">{formatCurrency(order.totalAmount)}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(order.createdAt)} · {customerName}
          </p>
          <p className="text-xs">
            {labels.orderStatus[order.orderStatus as OrderStatus]} ·{" "}
            {labels.paymentStatus[order.paymentStatus as PaymentStatus]}
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between gap-2 text-muted-foreground">
                <span>
                  {translateProduct({ name: item.productName, iconName: null })} (
                  {labels.service[item.serviceType as ServiceType]})
                </span>
                <span className="text-right">
                  {hasLinePriceAdjustment(item) ? (
                    <>
                      <span className="font-medium text-foreground">
                        {formatCurrency(item.subtotal)}
                      </span>
                      <span className="ml-2 text-xs line-through">
                        {formatCurrency(linePriceCatalogTotal(item))}
                      </span>
                    </>
                  ) : (
                    formatCurrency(item.subtotal)
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-1 text-2xl font-bold", accent && "text-trust")}>{value}</p>
    </div>
  );
}
