import type { ReceiptData } from "./types";

export interface ProductLabelData {
  companyName: string;
  orderNumber: string;
  itemNumber: string;
  customerName: string;
  deliveryDate: string;
  productName: string;
  serviceLabel: string;
  colorLabel?: string;
}

export function buildProductLabelsFromReceipt(
  receipt: ReceiptData
): ProductLabelData[] {
  const customerName =
    receipt.customerName?.trim() || receipt.customerPhone || "Musteri";
  return receipt.lines.map((line, index) => ({
    companyName: receipt.companyName,
    orderNumber: receipt.order.orderNumber,
    itemNumber:
      line.itemNumber ??
      `${receipt.order.orderNumber}-${String(index + 1).padStart(2, "0")}`,
    customerName,
    deliveryDate: receipt.order.deliveryDate,
    productName: line.productName,
    serviceLabel: line.serviceLabel,
    colorLabel: line.colorLabel,
  }));
}
