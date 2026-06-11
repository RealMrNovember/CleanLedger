import type { TranslateFn } from "../i18n/labels";
import type { CustomerHistoryExportData } from "./history-export";

export interface CustomerHistoryPdfLabels {
  reportTitle: string;
  period: string;
  generated: string;
  summary: string;
  field: string;
  value: string;
  totalSpent: string;
  orderCount: string;
  firstVisit: string;
  lastVisit: string;
  topProducts: string;
  count: string;
  orderHistory: string;
  noRecords: string;
  refunded: string;
  payment: string;
  ordersTable: {
    order: string;
    date: string;
    status: string;
    amount: string;
  };
  pageTitle: (customerName: string) => string;
}

export function getCustomerHistoryPdfLabels(t: TranslateFn): CustomerHistoryPdfLabels {
  return {
    reportTitle: t("pdf.customerHistoryTitle"),
    period: t("pdf.period"),
    generated: t("pdf.generated"),
    summary: t("pdf.summary"),
    field: t("pdf.field"),
    value: t("pdf.value"),
    totalSpent: t("pdf.totalSpent"),
    orderCount: t("pdf.orderCount"),
    firstVisit: t("pdf.firstVisit"),
    lastVisit: t("pdf.lastVisit"),
    topProducts: t("pdf.topProducts"),
    count: t("pdf.count"),
    orderHistory: t("pdf.orderHistory"),
    noRecords: t("pdf.noRecords"),
    refunded: t("pdf.refunded"),
    payment: t("pdf.payment"),
    ordersTable: {
      order: t("pdf.colOrder"),
      date: t("pdf.colDate"),
      status: t("pdf.colStatus"),
      amount: t("pdf.colAmount"),
    },
    pageTitle: (customerName) =>
      t("pdf.customerHistoryPageTitle", { name: customerName }),
  };
}

export function buildCustomerHistoryHtml(
  data: CustomerHistoryExportData,
  labels: CustomerHistoryPdfLabels,
  locale: string,
  formatDateTime: (iso: string) => string,
  formatCurrency: (amount: number) => string,
  escapeHtml: (value: string) => string
): string {
  const dash = "—";
  const summaryRows = [
    [labels.totalSpent, formatCurrency(data.analytics.totalSpent)],
    [labels.orderCount, String(data.analytics.orderCount)],
    [
      labels.firstVisit,
      data.analytics.firstVisit ? formatDateTime(data.analytics.firstVisit) : dash,
    ],
    [
      labels.lastVisit,
      data.analytics.lastVisit ? formatDateTime(data.analytics.lastVisit) : dash,
    ],
  ];

  const topProducts = data.analytics.topProducts
    .map(
      (row) =>
        `<li>${escapeHtml(row.name)} <span class="muted">${row.count}×</span></li>`
    )
    .join("");

  const entries = data.entries
    .map((entry) => {
      const items = entry.items
        .map(
          (item) =>
            `<li>${escapeHtml(item.productName)} — ${escapeHtml(item.serviceLabel)} · ${formatCurrency(item.subtotal)}</li>`
        )
        .join("");
      const payments = entry.payments
        .map(
          (p) =>
            `<li class="payment">${formatDateTime(p.createdAt)} · ${escapeHtml(p.methodLabel)} · ${formatCurrency(p.amount)}${p.refunded ? ` (${labels.refunded})` : ""}</li>`
        )
        .join("");
      return `<section class="entry">
        <h3>${escapeHtml(entry.orderNumber)}</h3>
        <p class="meta">${formatDateTime(entry.createdAt)} · ${escapeHtml(entry.orderStatusLabel)} / ${escapeHtml(entry.paymentStatusLabel)} · <strong>${formatCurrency(entry.totalAmount)}</strong></p>
        <ul>${items}</ul>
        ${payments ? `<ul class="payments">${payments}</ul>` : ""}
      </section>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="${escapeHtml(locale)}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(labels.pageTitle(data.customerName))}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    body { font-family: "Segoe UI", system-ui, sans-serif; color: #111; font-size: 12px; line-height: 1.45; margin: 0; padding: 16px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    h2 { font-size: 14px; margin: 20px 0 8px; color: #0f3d3a; }
    h3 { font-size: 13px; margin: 0 0 4px; }
    .muted { color: #666; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0 16px; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
    th { background: #0f3d3a; color: #fff; }
    .entry { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; break-inside: avoid; }
    .meta { margin: 0 0 6px; color: #444; }
    ul { margin: 0; padding-left: 18px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(data.companyName || "CleanLedger")}</h1>
  <p class="muted">${escapeHtml(labels.reportTitle)}</p>
  <p><strong>${escapeHtml(data.customerName)}</strong> · ${escapeHtml(data.phone)}</p>
  <p class="muted">${escapeHtml(labels.period)}: ${escapeHtml(data.dateRangeLabel)} · ${escapeHtml(labels.generated)}: ${formatDateTime(data.generatedAt)}</p>

  <h2>${escapeHtml(labels.summary)}</h2>
  <table>
    <thead><tr><th>${escapeHtml(labels.field)}</th><th>${escapeHtml(labels.value)}</th></tr></thead>
    <tbody>
      ${summaryRows.map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`).join("")}
    </tbody>
  </table>

  ${topProducts ? `<h2>${escapeHtml(labels.topProducts)}</h2><ul>${topProducts}</ul>` : ""}

  <h2>${escapeHtml(labels.orderHistory)}</h2>
  ${entries || `<p>${escapeHtml(labels.noRecords)}</p>`}
</body>
</html>`;
}
