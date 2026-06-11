import type {
  CustomerReportRow,
  OrderWorkReportRow,
  ReportDateRange,
  ReportType,
  RevenueReportSummary,
} from "@/db/client";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  hasLinePriceAdjustment,
  linePriceCatalogTotal,
} from "@cleanledger/shared/reports";
import type { OrderStatus, PaymentStatus, ServiceType } from "@/db/schema";
import { Logo } from "@/components/brand/Logo";
import { useI18n } from "@/context/I18nContext";
import { translateProductName } from "@cleanledger/shared/i18n/catalog-mappers";

interface ReportPrintViewProps {
  companyName: string;
  reportType: ReportType;
  range: ReportDateRange;
  revenue?: RevenueReportSummary;
  customers?: CustomerReportRow[];
  orders?: OrderWorkReportRow[];
}

export function ReportPrintView({
  companyName,
  reportType,
  range,
  revenue,
  customers,
  orders,
}: ReportPrintViewProps) {
  const { t, labels } = useI18n();
  const generatedAt = formatDateTime(new Date());

  const reportTitles: Record<ReportType, string> = {
    revenue: t("reports.printTitleRevenue"),
    customers: t("reports.printTitleCustomers"),
    orders: t("reports.printTitleOrders"),
  };

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
            <p className="text-sm text-black/70">{reportTitles[reportType]}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{t("reports.printPeriod")}</p>
            <p>{range.label}</p>
            <p className="mt-2 text-xs text-black/60">
              {t("reports.printGenerated")} {generatedAt}
            </p>
          </div>
        </div>
      </header>

      {reportType === "revenue" && revenue && (
        <div className="space-y-6">
          <table className="w-full border-collapse text-sm">
            <tbody>
              <SummaryRow
                label={t("reports.printOrderCount")}
                value={String(revenue.orderCount)}
              />
              <SummaryRow
                label={t("reports.grossRevenueBeforeDiscount")}
                value={formatCurrency(revenue.grossSubtotal)}
              />
              <SummaryRow
                label={t("reports.couponDiscounts")}
                value={formatCurrency(revenue.totalDiscounts)}
              />
              <SummaryRow
                label={t("reports.catalogTotalLines")}
                value={formatCurrency(revenue.catalogSubtotal)}
              />
              <SummaryRow
                label={t("reports.posLineDiscount")}
                value={formatCurrency(revenue.linePriceAdjustments)}
              />
              {revenue.adjustedLineCount > 0 && (
                <SummaryRow
                  label={t("reports.discountedLineCount")}
                  value={String(revenue.adjustedLineCount)}
                />
              )}
              <SummaryRow
                label={t("reports.netRevenue")}
                value={formatCurrency(revenue.netRevenue)}
                emphasis
              />
              <SummaryRow
                label={t("reports.collected")}
                value={formatCurrency(revenue.collected)}
              />
              <SummaryRow
                label={t("reports.outstanding")}
                value={formatCurrency(revenue.outstanding)}
              />
              {revenue.refundedPayments > 0 && (
                <SummaryRow
                  label={t("reports.refundedPayments")}
                  value={formatCurrency(revenue.refundedPayments)}
                />
              )}
            </tbody>
          </table>
        </div>
      )}

      {reportType === "customers" && customers && (
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-black/30 text-left">
              <th className="py-2 pr-2">{t("reports.printCustomerCol")}</th>
              <th className="py-2 pr-2">{t("reports.colPhone")}</th>
              <th className="py-2 pr-2 text-center">{t("reports.colVisits")}</th>
              <th className="py-2 pr-2 text-right">{t("reports.colSpend")}</th>
              <th className="py-2 text-right">{t("reports.colLastVisit")}</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((row) => (
              <tr key={row.phone} className="border-b border-black/10">
                <td className="py-2 pr-2 font-medium">{row.customerName}</td>
                <td className="py-2 pr-2">{row.phone}</td>
                <td className="py-2 pr-2 text-center">{row.visitCount}</td>
                <td className="py-2 pr-2 text-right">
                  {formatCurrency(row.totalSpent)}
                </td>
                <td className="py-2 text-right">
                  {formatDateTime(row.lastVisitAt)}
                </td>
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
                {formatDateTime(order.createdAt)} · {customerName} ·{" "}
                {order.customerPhone}
              </p>
              <p className="text-xs">
                {labels.orderStatus[order.orderStatus as OrderStatus]} ·{" "}
                {labels.paymentStatus[order.paymentStatus as PaymentStatus]}
              </p>
              <ul className="mt-2 space-y-1 text-xs">
                {items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-2">
                    <span>
                      {translateProductName(t, {
                        name: item.productName,
                        iconName: null,
                      })}{" "}
                      — {labels.service[item.serviceType as ServiceType]}
                    </span>
                    <span>
                      {hasLinePriceAdjustment(item) ? (
                        <>
                          {formatCurrency(item.subtotal)}{" "}
                          <span className="text-black/50 line-through">
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
      )}

      <footer className="mt-8 border-t border-black/20 pt-4 text-center text-xs text-black/50">
        {t("reports.printFooter")}
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
