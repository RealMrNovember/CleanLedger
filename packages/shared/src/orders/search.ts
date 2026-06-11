/** Sipariş takibi ekranı teslim durumu filtresi */
export type OrderDeliveryFilter = "all" | "active" | "delivered";

export const ORDER_DELIVERY_FILTER_LABELS: Record<OrderDeliveryFilter, string> = {
  all: "Tümü",
  active: "Bekleyen",
  delivered: "Teslim",
};

export function normalizePhoneSearch(value: string): string {
  return value.replace(/\D/g, "");
}

export interface OrderSearchColorField {
  label: string;
  hex: string;
}

export interface OrderSearchFields {
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  itemColors?: OrderSearchColorField[];
  itemNumbers?: string[];
}

export function orderMatchesTrackingSearch(
  order: OrderSearchFields,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  if (order.orderNumber.toLowerCase().includes(q)) return true;

  for (const itemNo of order.itemNumbers ?? []) {
    if (itemNo.toLowerCase().includes(q)) return true;
  }

  const name = (order.customerName ?? "").toLowerCase();
  if (name && name.includes(q)) return true;

  const phone = order.customerPhone ?? "";
  const qDigits = normalizePhoneSearch(q);
  const phoneDigits = normalizePhoneSearch(phone);
  if (qDigits.length >= 3 && phoneDigits.includes(qDigits)) return true;
  if (phone.toLowerCase().includes(q)) return true;

  for (const color of order.itemColors ?? []) {
    if (color.label.toLowerCase().includes(q)) return true;
    if (color.hex.toLowerCase().includes(q)) return true;
  }

  return false;
}

export function filterOrdersByDelivery<T extends { orderStatus: string }>(
  orders: T[],
  deliveryFilter: OrderDeliveryFilter
): T[] {
  if (deliveryFilter === "all") return orders;
  if (deliveryFilter === "delivered") {
    return orders.filter((o) => o.orderStatus === "delivered");
  }
  return orders.filter((o) => o.orderStatus !== "delivered");
}

export function filterTrackingOrders<
  T extends OrderSearchFields & { orderStatus: string },
>(orders: T[], query: string, deliveryFilter: OrderDeliveryFilter): T[] {
  const byDelivery = filterOrdersByDelivery(orders, deliveryFilter);
  if (!query.trim()) return byDelivery;
  return byDelivery.filter((o) => orderMatchesTrackingSearch(o, query));
}
