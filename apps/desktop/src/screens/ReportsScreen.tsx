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
import { downloadReportPdf } from "@/lib/report-pdf";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  SERVICE_LABELS,
  type OrderStatus,
  type PaymentStatus,
  type ServiceType,
} from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const PERIOD_OPTIONS: { value: ReportPeriod; label: string }[] = [
  { value: "daily", label: "Günlük" },
  { value: "weekly", label: "Haftalık" },
  { value: "monthly", label: "Aylık" },
];

const TYPE_OPTIONS: { value: ReportType; label: string; desc: string }[] = [
  { value: "revenue", label: "Gelir & Tahsilat", desc: "Ciro, indirim, tahsilat ve cari özeti" },
  { value: "customers", label: "Müşteri Listesi", desc: "Ziyaret sayısı ve harcama dağılımı" },
  { value: "orders", label: "Yapılan İşler", desc: "Tüm siparişler, kalemler ve detaylar" },
];

export function ReportsScreen() {
  const { user } = useAuth();
  const companyName = user?.companyName ?? "CleanLedger";
  const [period, setPeriod] = useState<ReportPeriod>("daily");
  const [reportType, setReportType] = useState<ReportType>("revenue");
  const [anchorDate, setAnchorDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
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

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      await downloadReportPdf({
        companyName,
        reportType,
        range,
        revenue: revenue ?? undefined,
        customers,
        orders,
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white text-gray-900 dark:bg-slate-900 dark:text-gray-100">
      <div className="shrink-0 border-b border-border/60 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <BarChart3 className="size-7 text-trust" />
              Raporlar
            </h1>
            <p className="text-sm text-muted-foreground">
              Gelir, müşteri ve işlem raporlarını PDF olarak indirin
            </p>
          </div>
          <Button
            className="gap-2 print:hidden"
            disabled={loading || exporting}
            onClick={() => void handleExportPdf()}
          >
            <FileDown className="size-4" />
            {exporting ? "Hazırlanıyor..." : "PDF İndir"}
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 sm:p-6 lg:grid-cols-[280px_1fr]">
        <Card className="min-h-0 overflow-y-auto print:hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Rapor Ayarları</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium">Dönem</label>
              <div className="grid grid-cols-3 gap-2">
                {PERIOD_OPTIONS.map((opt) => (
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
                Referans Tarihi
              </label>
              <Input
                type="date"
                value={anchorDate}
                onChange={(e) => setAnchorDate(e.target.value)}
              />
              <p className="mt-2 text-xs text-muted-foreground">{range.label}</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Rapor Türü</label>
              <div className="space-y-2">
                {TYPE_OPTIONS.map((opt) => (
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
            <CardTitle>{TYPE_OPTIONS.find((t) => t.value === reportType)?.label}</CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {loading ? (
              <p className="text-muted-foreground">Rapor hazırlanıyor...</p>
            ) : reportType === "revenue" && revenue ? (
              <RevenuePreview summary={revenue} />
            ) : reportType === "customers" ? (
              <CustomersPreview rows={customers} />
            ) : (
              <OrdersPreview rows={orders} />
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
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Stat label="Sipariş" value={String(summary.orderCount)} />
      <Stat label="Net Ciro" value={formatCurrency(summary.netRevenue)} accent />
      <Stat label="Tahsil Edilen" value={formatCurrency(summary.collected)} />
      <Stat label="Bekleyen / Cari" value={formatCurrency(summary.outstanding)} />
      <Stat label="İndirimler" value={formatCurrency(summary.totalDiscounts)} />
      <Stat label="Brüt Ciro" value={formatCurrency(summary.grossSubtotal)} />
    </div>
  );
}

function CustomersPreview({ rows }: { rows: CustomerReportRow[] }) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground">Bu dönemde müşteri ziyareti yok.</p>;
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
              {row.phone} · {row.visitCount} ziyaret · Son: {formatDateTime(row.lastVisitAt)}
            </p>
          </div>
          <p className="font-bold text-trust">{formatCurrency(row.totalSpent)}</p>
        </div>
      ))}
    </div>
  );
}

function OrdersPreview({ rows }: { rows: OrderWorkReportRow[] }) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground">Bu dönemde işlem kaydı yok.</p>;
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
            {ORDER_STATUS_LABELS[order.orderStatus as OrderStatus]} ·{" "}
            {PAYMENT_STATUS_LABELS[order.paymentStatus as PaymentStatus]}
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between gap-2 text-muted-foreground">
                <span>
                  {item.productName} ({SERVICE_LABELS[item.serviceType as ServiceType]})
                </span>
                <span>{formatCurrency(item.subtotal)}</span>
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
