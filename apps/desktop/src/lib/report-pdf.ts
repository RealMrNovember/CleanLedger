import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  CustomerReportRow,
  OrderWorkReportRow,
  ReportDateRange,
  ReportType,
  RevenueReportSummary,
} from "@/db/client";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  SERVICE_LABELS,
  type OrderStatus,
  type PaymentStatus,
  type ServiceType,
} from "@/db/schema";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const REPORT_TITLES: Record<ReportType, string> = {
  revenue: "Gelir & Tahsilat Raporu",
  customers: "Müşteri Ziyaret Raporu",
  orders: "Yapılan İşler Raporu",
};

async function loadLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch("/report-logo.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function addPdfHeader(
  doc: jsPDF,
  companyName: string,
  reportType: ReportType,
  range: ReportDateRange,
  logo: string | null
): number {
  let y = 16;
  if (logo) {
    doc.addImage(logo, "PNG", 14, y, 18, 18);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(companyName || "CleanLedger", logo ? 36 : 14, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(REPORT_TITLES[reportType], logo ? 36 : 14, y + 14);
  doc.text(`Dönem: ${range.label}`, logo ? 36 : 14, y + 19);
  doc.text(
    `Oluşturulma: ${formatDateTime(new Date())}`,
    logo ? 36 : 14,
    y + 24
  );
  doc.setTextColor(0, 0, 0);
  return y + 32;
}

export async function downloadReportPdf(options: {
  companyName: string;
  reportType: ReportType;
  range: ReportDateRange;
  revenue?: RevenueReportSummary;
  customers?: CustomerReportRow[];
  orders?: OrderWorkReportRow[];
}): Promise<void> {
  const { companyName, reportType, range, revenue, customers, orders } = options;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const logo = await loadLogoBase64();
  let startY = addPdfHeader(doc, companyName, reportType, range, logo);

  if (reportType === "revenue" && revenue) {
    autoTable(doc, {
      startY,
      head: [["Kalem", "Tutar"]],
      body: [
        ["Sipariş Sayısı", String(revenue.orderCount)],
        ["Brüt Ciro (indirim öncesi)", formatCurrency(revenue.grossSubtotal)],
        ["Toplam İndirim", formatCurrency(revenue.totalDiscounts)],
        ["Net Ciro", formatCurrency(revenue.netRevenue)],
        ["Tahsil Edilen", formatCurrency(revenue.collected)],
        ["Bekleyen / Cari", formatCurrency(revenue.outstanding)],
        ...(revenue.refundedPayments > 0
          ? [["İade Edilen Ödemeler", formatCurrency(revenue.refundedPayments)]]
          : []),
      ],
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [15, 61, 58], textColor: 255 },
      margin: { left: 14, right: 14 },
    });
  }

  if (reportType === "customers" && customers) {
    autoTable(doc, {
      startY,
      head: [["Müşteri", "Telefon", "Ziyaret", "Harcama", "Son Ziyaret"]],
      body: customers.map((row) => [
        row.customerName,
        row.phone,
        String(row.visitCount),
        formatCurrency(row.totalSpent),
        formatDateTime(row.lastVisitAt),
      ]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [15, 61, 58], textColor: 255 },
      margin: { left: 14, right: 14 },
    });
  }

  if (reportType === "orders" && orders) {
    autoTable(doc, {
      startY,
      head: [["Fiş No", "Tarih", "Müşteri", "Durum", "Tutar"]],
      body: orders.map(({ order, customerName }) => [
        order.orderNumber,
        formatDateTime(order.createdAt),
        customerName,
        `${ORDER_STATUS_LABELS[order.orderStatus as OrderStatus]} / ${PAYMENT_STATUS_LABELS[order.paymentStatus as PaymentStatus]}`,
        formatCurrency(order.totalAmount),
      ]),
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [15, 61, 58], textColor: 255 },
      margin: { left: 14, right: 14 },
    });

    const tableEnd =
      (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? startY + 20;

    let detailY = tableEnd + 8;
    for (const { order, customerName, items } of orders) {
      if (detailY > 260) {
        doc.addPage();
        detailY = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`${order.orderNumber} · ${customerName}`, 14, detailY);
      detailY += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      for (const item of items) {
        doc.text(
          `- ${item.productName} (${SERVICE_LABELS[item.serviceType as ServiceType]}): ${formatCurrency(item.subtotal)}`,
          16,
          detailY
        );
        detailY += 4;
      }
      detailY += 4;
    }
  }

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("CleanLedger · Cicibyte Corp", 14, 287);

  const safeName = companyName.replace(/[^\w\-]+/g, "_").slice(0, 24);
  const dateKey = new Date().toISOString().slice(0, 10);
  doc.save(`CleanLedger_${reportType}_${safeName}_${dateKey}.pdf`);
}
