import type { Order, OrderItem } from "../schema/index";
import { formatItemNumber, formatOrderNumber, parseOrderNumber } from "./order-numbers";

export interface OrderNumberConflictResolution {
  orderNumber: string;
  /** Başka siparişlere verilen yeni numaralar (çakışma çözümü). */
  reassignments: Array<{
    globalId: string;
    orderNumber: string;
  }>;
}

/** Mevcut siparişlerden yıl → en yüksek sıra haritası üretir. */
export function buildMaxSequenceByYear(
  orders: Array<Pick<Order, "orderNumber">>
): Map<number, number> {
  const map = new Map<number, number>();
  for (const order of orders) {
    const parsed = parseOrderNumber(order.orderNumber);
    if (!parsed) continue;
    const prev = map.get(parsed.year) ?? 0;
    if (parsed.sequence > prev) {
      map.set(parsed.year, parsed.sequence);
    }
  }
  return map;
}

export function nextSequenceForYear(
  map: Map<number, number>,
  year: number
): number {
  return (map.get(year) ?? 0) + 1;
}

function allocateOrderNumber(
  orders: Array<Pick<Order, "orderNumber">>,
  year: number,
  excludeNumbers: Set<string> = new Set()
): string {
  const map = buildMaxSequenceByYear(orders);
  let seq = nextSequenceForYear(map, year);
  let candidate = formatOrderNumber(year, seq);
  const used = new Set([
    ...orders.map((o) => o.orderNumber),
    ...excludeNumbers,
  ]);
  while (used.has(candidate)) {
    seq += 1;
    candidate = formatOrderNumber(year, seq);
  }
  map.set(year, seq);
  return candidate;
}

/**
 * Sync merge / sunucu push sırasında çift sipariş numarasını engeller.
 * `preferIncoming` true ise gelen kayıt numarayı korur, çakışan eski kayıt yeniden numaralanır.
 */
export function resolveOrderNumberConflict(
  orders: Array<Pick<Order, "globalId" | "orderNumber">>,
  incoming: Pick<Order, "globalId" | "orderNumber">,
  preferIncoming = true
): OrderNumberConflictResolution {
  const others = orders.filter((o) => o.globalId !== incoming.globalId);
  const conflict = others.find((o) => o.orderNumber === incoming.orderNumber);
  if (!conflict) {
    return { orderNumber: incoming.orderNumber, reassignments: [] };
  }

  const parsed =
    parseOrderNumber(incoming.orderNumber) ??
    parseOrderNumber(conflict.orderNumber);
  const year = parsed?.year ?? new Date().getFullYear();

  const reassignments: OrderNumberConflictResolution["reassignments"] = [];

  if (preferIncoming) {
    const newNumber = allocateOrderNumber(orders, year, new Set([incoming.orderNumber]));
    if (conflict.globalId) {
      reassignments.push({ globalId: conflict.globalId, orderNumber: newNumber });
    }
    return { orderNumber: incoming.orderNumber, reassignments };
  }

  const newIncomingNumber = allocateOrderNumber(orders, year);
  return { orderNumber: newIncomingNumber, reassignments };
}

/** Sipariş numarası değişince kalem numaralarını yeniden üretir. */
export function remapItemNumbersForOrder(
  orderNumber: string,
  items: Array<Pick<OrderItem, "id" | "orderId" | "itemNumber">>,
  orderId: number
): Array<{ id: number; itemNumber: string }> {
  const orderItems = items
    .filter((i) => i.orderId === orderId)
    .sort((a, b) => a.id - b.id);
  return orderItems.map((item, index) => ({
    id: item.id,
    itemNumber: formatItemNumber(orderNumber, index + 1),
  }));
}
