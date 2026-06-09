import type {
  CustomerReportRow,
  OrderWorkReportRow,
  ReportDateRange,
  ReportType,
  RevenueReportSummary,
} from "@/db/client";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  SERVICE_LABELS,
  type OrderStatus,
  type PaymentStatus,
  type ServiceType,
} from "@/db/schema";
import { Logo } from "@/components/brand/Logo";

interface ReportPrintViewProps {
  companyName: string;
  reportType: ReportType;
  range: ReportDateRange;
  revenue?: RevenueReportSummary;
  customers?: CustomerReportRow[];
  orders?: OrderWorkReportRow[];
}

const REPORT_TITLES: Record<ReportType, string> = {
  revenue: "Gelir & Tahsilat Raporu",
  customers: "Müşteri Ziyaret Raporu",
  orders: "Yapılan İşler Raporu",
};

export function ReportPrintView({
  companyName,
  reportType,
  range,
  revenue,
  customers,
  orders,
}: ReportPrintViewProps) {
  const generatedAt = formatDateTime(new Date());

  return (
    <div
      id="cleanledger-report"
      className="hidden print:block mx-auto max-w-[210mm] bg-white p-8 text-black"
    >
      <header className="mb-6 border-b-2 border-black/20 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Logo size="sm" showText />
            <p className="mt-2 text-lg font-bold">{companyName}</p>
            <p className="text-sm text-black/70">{REPORT_TITLES[reportType]}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">Dönem</p>
            <p>{range.label}</p>
            <p className="mt-2 text-xs text-black/60">Oluşturulma: {generatedAt}</p>
          </div>
        </div>
      </header>

      {reportType === "revenue" && revenue && (
        <div className="space-y-6">
          <table className="w-full border-collapse text-sm">
            <tbody>
              <SummaryRow label="Sipariş Sayısı" value={String(revenue.orderCount)} />
              <SummaryRow label="Brüt Ciro (indirim öncesi)" value={formatCurrency(revenue.grossSubtotal)} />
              <SummaryRow label="Toplam İndirim" value={formatCurrency(revenue.totalDiscounts)} />
              <SummaryRow label="Net Ciro" value={formatCurrency(revenue.netRevenue)} emphasis />
              <SummaryRow label="Tahsil Edilen" value={formatCurrency(revenue.collected)} />
              <SummaryRow label="Bekleyen / Cari" value={formatCurrency(revenue.outstanding)} />
              {revenue.refundedPayments > 0 && (
                <SummaryRow label="İade Edilen Ödemeler" value={formatCurrency(revenue.refundedPayments)} />
              )}
            </tbody>
          </table>
        </div>
      )}

      {reportType === "customers" && customers && (
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-black/30 text-left">
              <th className="py-2 pr-2">Müşteri</th>
              <th className="py-2 pr-2">Telefon</th>
              <th className="py-2 pr-2 text-center">Ziyaret</th>
              <th className="py-2 pr-2 text-right">Harcama</th>
              <th className="py-2 text-right">Son Ziyaret</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((row) => (
              <tr key={row.phone} className="border-b border-black/10">
                <td className="py-2 pr-2 font-medium">{row.customerName}</td>
                <td className="py-2 pr-2">{row.phone}</td>
                <td className="py-2 pr-2 text-center">{row.visitCount}</td>
                <td className="py-2 pr-2 text-right">{formatCurrency(row.totalSpent)}</td>
                <td className="py-2 text-right">{formatDateTime(row.lastVisitAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {reportType === "orders" && orders && (
        <div className="space-y-4">
          {orders.map(({ order, customerName, items }) => (
            <div key={order.id} className="break-inside-avoid border border-black/15 p-3">
              <div className="flex justify-between gap-2 text-sm font-semibold">
                <span>{order.orderNumber}</span>
                <span>{formatCurrency(order.totalAmount)}</span>
              </div>
              <p className="text-xs text-black/70">
                {formatDateTime(order.createdAt)} · {customerName} · {order.customerPhone}
              </p>
              <p className="text-xs">
                {ORDER_STATUS_LABELS[order.orderStatus as OrderStatus]} ·{" "}
                {PAYMENT_STATUS_LABELS[order.paymentStatus as PaymentStatus]}
              </p>
              <ul className="mt-2 space-y-1 text-xs">
                {items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-2">
                    <span>
                      {item.productName} — {SERVICE_LABELS[item.serviceType as ServiceType]}
                    </span>
                    <span>{formatCurrency(item.subtotal)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <footer className="mt-8 border-t border-black/20 pt-4 text-center text-xs text-black/50">
        CleanLedger · Cicibyte Corp · Bu rapor kalıcı işlem kayıtlarından üretilmiştir.
      </footer>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <tr className={emphasis ? "text-base font-bold" : ""}>
      <td className="py-2 pr-4">{label}</td>
      <td className="py-2 text-right">{value}</td>
    </tr>
  );
}
