export type {
  ShopContactInfo,
  ReceiptLine,
  ReceiptData,
} from "./types";
export type { ProductLabelData } from "./product-label";
export { buildProductLabelsFromReceipt } from "./product-label";
export { DEFAULT_SHOP_CONTACT } from "./types";
export {
  formatReceiptLineLabel,
  getReceiptTotals,
  buildReceiptSummaryRows,
} from "./service";
export {
  buildCustomerReceiptEscPos,
  buildProductLabelEscPos,
  buildProductLabelsEscPos,
  type ThermalWidth,
} from "./escpos";
export {
  buildThermalEscPosPayload,
  type PrintDeliveryMethod,
  type PrintDeliveryResult,
  type ThermalPrintRequest,
} from "./print-adapters";
