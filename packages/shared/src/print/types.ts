import type { Order } from "../schema/index";

export interface ShopContactInfo {
  companyName: string;
  phone?: string;
  email?: string;
  address?: string;
  logoDataUrl?: string;
}

export const DEFAULT_SHOP_CONTACT: ShopContactInfo = {
  companyName: "CleanLedger",
  phone: "+90 535 489 50 50",
  email: "destek@cicibyte.com",
  address: "www.cicibyte.com",
};

export interface ReceiptLine {
  productName: string;
  serviceLabel: string;
  unitPrice: number;
  itemNumber?: string;
  colorLabel?: string;
}

export interface ReceiptData {
  order: Order;
  companyName: string;
  customerPhone: string;
  customerName?: string;
  lines: ReceiptLine[];
  discountAmount?: number;
  amountPaid?: number;
  balanceDue?: number;
  shopContact?: ShopContactInfo;
}
