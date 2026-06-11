import type { ReceiptData } from "./types";
import type { ProductLabelData } from "./product-label";
import type { ThermalWidth } from "./escpos";
import {
  buildCustomerReceiptEscPos,
  buildProductLabelsEscPos,
} from "./escpos";

export type PrintDeliveryMethod = "browser" | "escpos";

export interface PrintDeliveryResult {
  method: PrintDeliveryMethod;
  success: boolean;
  message?: string;
}

export interface ThermalPrintRequest {
  width: ThermalWidth;
  receipt?: ReceiptData;
  labels?: ProductLabelData[];
}

export function buildThermalEscPosPayload(
  request: ThermalPrintRequest
): Uint8Array | null {
  if (request.receipt) {
    return buildCustomerReceiptEscPos(request.receipt, { width: request.width });
  }
  if (request.labels && request.labels.length > 0) {
    return buildProductLabelsEscPos(request.labels, { width: request.width });
  }
  return null;
}
