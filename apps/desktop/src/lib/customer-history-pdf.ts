import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { CustomerHistoryExportData } from "@cleanledger/shared";
import {
  getCustomerHistoryPdfLabels,
  type CustomerHistoryPdfLabels,
} from "@cleanledger/shared/customers/history-pdf-i18n";
import type { Locale } from "@cleanledger/shared/i18n";
import { getTranslationSafe } from "@cleanledger/shared/i18n";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export async function downloadCustomerHistoryPdf(
  data: CustomerHistoryExportData,
  locale: Locale = "tr"
): Promise<void> {
  const t = (key: string, params?: Record<string, string>) =>
    getTranslationSafe(locale, key, params);
  const labels = getCustomerHistoryPdfLabels(t);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(data.companyName || "CleanLedger", 14, y);
  y += 8;
  doc.setFontSize(12);
  doc.text(labels.reportTitle, 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`${data.customerName} · ${data.phone}`, 14, y);
  y += 5;
  doc.text(`${labels.period}: ${data.dateRangeLabel}`, 14, y);
  y += 5;
  doc.text(`${labels.generated}: ${formatDateTime(data.generatedAt)}`, 14, y);
  y += 8;
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    startY: y,
    head: [[labels.summary, labels.value]],
    body: buildSummaryRows(data, labels, formatDateTime, formatCurrency),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [15, 61, 58], textColor: 255 },
    margin: { left: 14, right: 14 },
  });

  let startY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? y + 20;
  startY += 6;

  if (data.analytics.topProducts.length > 0) {
    autoTable(doc, {
      startY,
      head: [[labels.topProducts, labels.count]],
      body: data.analytics.topProducts.map((row) => [row.name, String(row.count)]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [69, 183, 209], textColor: 255 },
      margin: { left: 14, right: 14 },
    });
    startY =
      (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? startY + 10;
    startY += 6;
  }

  autoTable(doc, {
    startY,
    head: [
      [
        labels.ordersTable.order,
        labels.ordersTable.date,
        labels.ordersTable.status,
        labels.ordersTable.amount,
      ],
    ],
    body: data.entries.map((entry) => [
      entry.orderNumber,
      formatDateTime(entry.createdAt),
      `${entry.orderStatusLabel} / ${entry.paymentStatusLabel}`,
      formatCurrency(entry.totalAmount),
    ]),
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [15, 61, 58], textColor: 255 },
    margin: { left: 14, right: 14 },
  });

  let detailY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? startY + 20;
  detailY += 8;

  for (const entry of data.entries) {
    if (detailY > 260) {
      doc.addPage();
      detailY = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(
      `${entry.orderNumber} · ${formatDateTime(entry.createdAt)} · ${formatCurrency(entry.totalAmount)}`,
      14,
      detailY
    );
    detailY += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    for (const item of entry.items) {
      doc.text(
        `- ${item.productName} (${item.serviceLabel}): ${formatCurrency(item.subtotal)}`,
        16,
        detailY
      );
      detailY += 4;
    }
    if (entry.payments.length > 0) {
      detailY += 2;
      for (const payment of entry.payments) {
        doc.text(
          `  ${labels.payment}: ${formatDateTime(payment.createdAt)} · ${payment.methodLabel} · ${formatCurrency(payment.amount)}${payment.refunded ? ` (${labels.refunded})` : ""}`,
          16,
          detailY
        );
        detailY += 4;
      }
    }
    detailY += 4;
  }

  const safeCustomer = data.customerName.replace(/[^\w\-]+/g, "_").slice(0, 24);
  const dateKey = new Date().toISOString().slice(0, 10);
  doc.save(`CleanLedger_Customer_${safeCustomer}_${dateKey}.pdf`);
}

function buildSummaryRows(
  data: CustomerHistoryExportData,
  labels: CustomerHistoryPdfLabels,
  formatDateTime: (iso: string) => string,
  formatCurrency: (amount: number) => string
): string[][] {
  const dash = "—";
  return [
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
}
