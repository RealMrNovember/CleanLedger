export type {
  ShopContactInfo,
  ReceiptLine,
  ReceiptData,
} from "@cleanledger/shared/print";
export {
  DEFAULT_SHOP_CONTACT,
  formatReceiptLineLabel,
  getReceiptTotals,
  buildReceiptSummaryRows,
} from "@cleanledger/shared/print";

export function triggerBrowserPrint(): void {
  window.print();
}
