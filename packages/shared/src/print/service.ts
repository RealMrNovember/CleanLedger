import { formatCurrency } from "../utils";
import type { ReceiptData } from "./types";

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
