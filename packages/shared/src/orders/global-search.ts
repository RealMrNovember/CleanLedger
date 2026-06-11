import { normalizePhoneSearch } from "./search";

export interface GlobalSearchOrderHit {
  kind: "order";
  id: number;
  orderNumber: string;
  customerName?: string;
  customerPhone: string;
  orderStatus: string;
}

export interface GlobalSearchCustomerHit {
  kind: "customer";
  id: number;
  name: string;
  lastName?: string | null;
  phone: string;
}

export type GlobalSearchHit = GlobalSearchOrderHit | GlobalSearchCustomerHit;

export function orderMatchesGlobalSearch(
  order: {
    orderNumber: string;
    customerName?: string;
    customerPhone: string;
    itemNumbers?: string[];
  },
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;

  if (order.orderNumber.toLowerCase().includes(q)) return true;

  for (const itemNo of order.itemNumbers ?? []) {
    if (itemNo.toLowerCase().includes(q)) return true;
  }

  const name = (order.customerName ?? "").toLowerCase();
  if (name && name.includes(q)) return true;

  const phoneDigits = normalizePhoneSearch(order.customerPhone);
  const qDigits = normalizePhoneSearch(q);
  if (qDigits.length >= 3 && phoneDigits.includes(qDigits)) return true;
  if (order.customerPhone.toLowerCase().includes(q)) return true;

  return false;
}

export function customerMatchesGlobalSearch(
  customer: {
    name: string;
    lastName?: string | null;
    phone: string;
  },
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;

  const full = [customer.name, customer.lastName ?? ""]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (full.includes(q)) return true;
  if (customer.name.toLowerCase().includes(q)) return true;
  if ((customer.lastName ?? "").toLowerCase().includes(q)) return true;

  const phoneDigits = normalizePhoneSearch(customer.phone);
  const qDigits = normalizePhoneSearch(q);
  if (qDigits.length >= 3 && phoneDigits.includes(qDigits)) return true;

  return false;
}

export function rankGlobalSearchHits(
  hits: GlobalSearchHit[],
  query: string
): GlobalSearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return hits.slice(0, 12);

  const score = (hit: GlobalSearchHit): number => {
    if (hit.kind === "order") {
      if (hit.orderNumber.toLowerCase() === q) return 100;
      if (hit.orderNumber.toLowerCase().startsWith(q)) return 80;
      if ((hit.customerName ?? "").toLowerCase().startsWith(q)) return 60;
      return 40;
    }
    const full = [hit.name, hit.lastName ?? ""].filter(Boolean).join(" ").toLowerCase();
    if (full === q) return 90;
    if (full.startsWith(q)) return 70;
    return 50;
  };

  return [...hits].sort((a, b) => score(b) - score(a)).slice(0, 12);
}
