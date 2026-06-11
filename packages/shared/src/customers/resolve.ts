import { normalizePhoneSearch } from "../orders/search";
import { formatCustomerName } from "../utils";

export interface CustomerNameFields {
  id: number;
  phone: string;
  name: string;
  lastName?: string | null;
}

export interface OrderCustomerRef {
  customerId?: number | null;
  customerPhone: string;
}

export function phonesMatch(a: string, b: string): boolean {
  const left = a.trim();
  const right = b.trim();
  if (left === right) return true;

  const aDigits = normalizePhoneSearch(left);
  const bDigits = normalizePhoneSearch(right);
  if (aDigits.length < 7 || bDigits.length < 7) return false;
  if (aDigits === bDigits) return true;

  // TR: 905xx… ↔ 05xx… ↔ 5xx…
  return aDigits.endsWith(bDigits) || bDigits.endsWith(aDigits);
}

export function findCustomerForOrder<T extends CustomerNameFields>(
  order: OrderCustomerRef,
  customers: T[]
): T | undefined {
  if (order.customerId != null) {
    const byId = customers.find((c) => c.id === order.customerId);
    if (byId) return byId;
  }

  const exact = customers.find((c) => c.phone === order.customerPhone);
  if (exact) return exact;

  return customers.find((c) => phonesMatch(c.phone, order.customerPhone));
}

export function resolveCustomerNameForOrder<T extends CustomerNameFields>(
  order: OrderCustomerRef,
  customers: T[]
): string | undefined {
  const customer = findCustomerForOrder(order, customers);
  if (!customer) return undefined;
  const formatted = formatCustomerName(customer);
  return formatted.trim() !== "" ? formatted : undefined;
}
