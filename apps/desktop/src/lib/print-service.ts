import type { ReceiptData } from "@/components/pos/ReceiptPrintDialog";
import { formatCurrency } from "@/lib/utils";

export interface ShopContactInfo {
  companyName: string;
  phone?: string;
  email?: string;
  address?: string;
}

export const DEFAULT_SHOP_CONTACT: ShopContactInfo = {
  companyName: "CleanLedger",
  phone: "+90 535 489 50 50",
  email: "destek@cicibyte.com",
  address: "www.cicibyte.com",
};

export function formatReceiptLineLabel(productName: string, serviceLabel: string): string {
  return `${productName} - ${serviceLabel}`;
}

export function getReceiptTotals(receipt: ReceiptData) {
  const total = receipt.order.totalAmount;
  const paid = receipt.amountPaid ?? receipt.order.amountPaid ?? 0;
  const balance =
    receipt.balanceDue ?? receipt.order.balanceDue ?? Math.max(0, total - paid);
  const discount = receipt.discountAmount ?? receipt.order.discountAmount ?? 0;

  return { total, paid, balance, discount };
}

export function buildReceiptSummaryRows(receipt: ReceiptData): Array<{
  label: string;
  value: string;
  emphasis?: boolean;
}> {
  const { total, paid, balance, discount } = getReceiptTotals(receipt);
  const rows: Array<{ label: string; value: string; emphasis?: boolean }> = [];

  if (discount > 0) {
    rows.push({ label: "İndirim", value: `-${formatCurrency(discount)}` });
  }

  rows.push({ label: "Toplam Tutar", value: formatCurrency(total), emphasis: true });
  rows.push({ label: "Ödenen", value: formatCurrency(paid) });
  rows.push({
    label: "Kalan Borç",
    value: formatCurrency(balance),
    emphasis: balance > 0,
  });

  return rows;
}

export function triggerBrowserPrint(): void {
  window.print();
}
