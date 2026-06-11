import type { CustomerHistoryExportData } from "@cleanledger/shared";
import {
  buildCustomerHistoryHtml,
  getCustomerHistoryPdfLabels,
} from "@cleanledger/shared/customers/history-pdf-i18n";
import { AppError, ErrorCodes } from "@cleanledger/shared/errors";
import type { Locale } from "@cleanledger/shared/i18n";
import { translate } from "@cleanledger/shared/i18n";
import { formatCurrency, formatDateTime } from "@/lib/utils";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
    throw new AppError(ErrorCodes.PRINT_FRAME_FAILED);
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
    throw new AppError(ErrorCodes.PRINT_POPUP_BLOCKED);
  }
  win.addEventListener("load", () => {
    win.focus();
    win.print();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  });
}

/** Web: tarayıcı yazdır → PDF olarak kaydet. */
export function printCustomerHistoryPdf(
  data: CustomerHistoryExportData,
  locale: Locale = "tr"
): void {
  const t = (key: string, params?: Record<string, string>) =>
    translate(locale, key, params);
  const labels = getCustomerHistoryPdfLabels(t);
  const html = buildCustomerHistoryHtml(
    data,
    labels,
    locale,
    formatDateTime,
    formatCurrency,
    escapeHtml
  );
  try {
    printViaIframe(html);
  } catch {
    printViaBlobUrl(html);
  }
}
