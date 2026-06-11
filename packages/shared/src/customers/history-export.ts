import type { CustomerHistoryAnalytics } from "./analytics";

export interface CustomerHistoryExportEntry {
  orderNumber: string;
  createdAt: string;
  totalAmount: number;
  orderStatusLabel: string;
  paymentStatusLabel: string;
  deliveryDate: string;
  balanceDue: number;
  items: Array<{
    productName: string;
    serviceLabel: string;
    subtotal: number;
  }>;
  payments: Array<{
    createdAt: string;
    methodLabel: string;
    amount: number;
    refunded: boolean;
  }>;
}

export interface CustomerHistoryExportData {
  companyName: string;
  customerName: string;
  phone: string;
  generatedAt: string;
  dateRangeLabel: string;
  analytics: CustomerHistoryAnalytics;
  entries: CustomerHistoryExportEntry[];
}
