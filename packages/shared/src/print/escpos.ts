import type { ReceiptData } from "./types";
import type { ProductLabelData } from "./product-label";
import {
  buildReceiptSummaryRows,
  formatReceiptLineLabel,
} from "./service";

export type ThermalWidth = "58mm" | "80mm";

const ESC = 0x1b;
const GS = 0x1d;

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function textBytes(value: string): Uint8Array {
  return new TextEncoder().encode(toEscPosSafe(value));
}

function toEscPosSafe(value: string): string {
  return value
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "G")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "U")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "S")
    .replace(/ı/g, "i")
    .replace(/İ/g, "I")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "O")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "C");
}

function escposInit(): Uint8Array {
  return Uint8Array.from([ESC, 0x40]);
}

function escposAlign(center: boolean): Uint8Array {
  return Uint8Array.from([ESC, 0x61, center ? 1 : 0]);
}

function escposBold(on: boolean): Uint8Array {
  return Uint8Array.from([ESC, 0x45, on ? 1 : 0]);
}

function escposLineFeed(lines = 1): Uint8Array {
  return Uint8Array.from([...Array(lines).fill(0x0a)]);
}

function escposCut(): Uint8Array {
  return Uint8Array.from([GS, 0x56, 0x00]);
}

function divider(width: ThermalWidth): string {
  return width === "58mm" ? "-".repeat(32) : "-".repeat(42);
}

export function buildCustomerReceiptEscPos(
  receipt: ReceiptData,
  options?: { width?: ThermalWidth }
): Uint8Array {
  const width = options?.width ?? "80mm";
  const shop = receipt.shopContact;
  const lines: Uint8Array[] = [
    escposInit(),
    escposAlign(true),
    escposBold(true),
    textBytes(`${shop?.companyName ?? receipt.companyName}\n`),
    escposBold(false),
  ];

  if (shop?.phone) lines.push(textBytes(`Tel: ${shop.phone}\n`));
  lines.push(
    textBytes(`${divider(width)}\n`),
    escposAlign(false),
    textBytes(`Fis No: ${receipt.order.orderNumber}\n`),
    textBytes(
      `Musteri: ${receipt.customerName ?? receipt.customerPhone}\n`
    ),
    textBytes(`Teslim: ${receipt.order.deliveryDate}\n`),
    textBytes(`${divider(width)}\n`)
  );

  for (const line of receipt.lines) {
    const label = formatReceiptLineLabel(line.productName, line.serviceLabel);
    lines.push(
      escposBold(true),
      textBytes(`${label}\n`),
      escposBold(false)
    );
    if (line.colorLabel) {
      lines.push(textBytes(`Renk: ${line.colorLabel}\n`));
    }
    lines.push(textBytes(`  ${line.unitPrice.toFixed(2)} TL\n`));
  }

  lines.push(textBytes(`${divider(width)}\n`));
  for (const row of buildReceiptSummaryRows(receipt)) {
    lines.push(textBytes(`${row.label}: ${row.value}\n`));
  }

  lines.push(
    escposAlign(true),
    textBytes("\nCicibyte · CleanLedger\n"),
    escposLineFeed(3),
    escposCut()
  );

  return concatBytes(lines);
}

export function buildProductLabelEscPos(
  label: ProductLabelData,
  options?: { width?: ThermalWidth }
): Uint8Array {
  const width = options?.width ?? "58mm";
  return concatBytes([
    escposInit(),
    escposAlign(true),
    escposBold(true),
    textBytes(`${label.companyName}\n`),
    escposBold(false),
    textBytes(`${divider(width)}\n`),
    escposAlign(false),
    escposBold(true),
    textBytes(`${label.itemNumber}\n`),
    escposBold(false),
    textBytes(`Siparis: ${label.orderNumber}\n`),
    textBytes(`Musteri: ${label.customerName}\n`),
    textBytes(`Teslim: ${label.deliveryDate}\n`),
    textBytes(`${label.productName}\n`),
    textBytes(`${label.serviceLabel}\n`),
    ...(label.colorLabel ? [textBytes(`Renk: ${label.colorLabel}\n`)] : []),
    escposLineFeed(3),
    escposCut(),
  ]);
}

export function buildProductLabelsEscPos(
  labels: ProductLabelData[],
  options?: { width?: ThermalWidth }
): Uint8Array {
  return concatBytes(
    labels.map((label) => buildProductLabelEscPos(label, options))
  );
}
