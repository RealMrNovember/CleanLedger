import type { CustomerHistoryExportData } from "@cleanledger/shared";
import { formatCurrency, formatDateTime } from "@/lib/utils";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildCustomerHistoryHtml(data: CustomerHistoryExportData): string {
  const summaryRows = [
    ["Toplam harcama", formatCurrency(data.analytics.totalSpent)],
    ["Sipariş sayısı", String(data.analytics.orderCount)],
    [
      "İlk ziyaret",
      data.analytics.firstVisit
        ? formatDateTime(data.analytics.firstVisit)
        : "—",
    ],
    [
      "Son ziyaret",
      data.analytics.lastVisit ? formatDateTime(data.analytics.lastVisit) : "—",
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
            `<li class="payment">${formatDateTime(p.createdAt)} · ${escapeHtml(p.methodLabel)} · ${formatCurrency(p.amount)}${p.refunded ? " (iade)" : ""}</li>`
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
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <title>Müşteri Geçmişi — ${escapeHtml(data.customerName)}</title>
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
  <p class="muted">Müşteri Geçmiş Raporu</p>
  <p><strong>${escapeHtml(data.customerName)}</strong> · ${escapeHtml(data.phone)}</p>
  <p class="muted">Dönem: ${escapeHtml(data.dateRangeLabel)} · Oluşturulma: ${formatDateTime(data.generatedAt)}</p>

  <h2>Özet</h2>
  <table>
    <thead><tr><th>Alan</th><th>Değer</th></tr></thead>
    <tbody>
      ${summaryRows.map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`).join("")}
    </tbody>
  </table>

  ${topProducts ? `<h2>En sık ürünler</h2><ul>${topProducts}</ul>` : ""}

  <h2>Sipariş geçmişi</h2>
  ${entries || "<p>Kayıt yok.</p>"}
</body>
</html>`;
}

function printViaIframe(html: string): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute(
    "style",
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden"
  );
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = win?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    throw new Error("Yazdırma çerçevesi oluşturulamadı.");
  }

  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => {
    if (iframe.parentNode) document.body.removeChild(iframe);
  };

  const triggerPrint = () => {
    win?.focus();
    win?.print();
    window.setTimeout(cleanup, 1500);
  };

  window.setTimeout(triggerPrint, 150);
}

function printViaBlobUrl(html: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    URL.revokeObjectURL(url);
    throw new Error("Yazdırma penceresi açılamadı. Pop-up engelleyicisini kontrol edin.");
  }
  win.addEventListener("load", () => {
    win.focus();
    win.print();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  });
}

/** Web: tarayıcı yazdır → PDF olarak kaydet. */
export function printCustomerHistoryPdf(data: CustomerHistoryExportData): void {
  const html = buildCustomerHistoryHtml(data);
  try {
    printViaIframe(html);
  } catch {
    printViaBlobUrl(html);
  }
}
