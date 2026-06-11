export const ORDER_NUMBER_PREFIX = "CL";

/** CL-2026-000157 formatında sipariş numarası üretir. */
export function formatOrderNumber(year: number, sequence: number): string {
  return `${ORDER_NUMBER_PREFIX}-${year}-${String(sequence).padStart(6, "0")}`;
}

/** CL-2026-000157-01 formatında ürün satır numarası üretir. */
export function formatItemNumber(orderNumber: string, itemIndex: number): string {
  return `${orderNumber}-${String(itemIndex).padStart(2, "0")}`;
}

export function parseOrderNumber(
  value: string
): { prefix: string; year: number; sequence: number } | null {
  const match = /^CL-(\d{4})-(\d+)$/.exec(value.trim());
  if (!match) return null;
  return {
    prefix: ORDER_NUMBER_PREFIX,
    year: parseInt(match[1], 10),
    sequence: parseInt(match[2], 10),
  };
}

export function isOrderNumber(value: string): boolean {
  return parseOrderNumber(value) !== null;
}

export function isItemNumber(value: string): boolean {
  return /^CL-\d{4}-\d+-\d{2}$/.test(value.trim());
}
