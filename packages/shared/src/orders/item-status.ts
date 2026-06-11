import type { ItemStatus, OrderStatus } from "../schema/index";

/** Aktif iş akışı sırası (iptal hariç) */
export const ITEM_STATUS_WORKFLOW: ItemStatus[] = [
  "received",
  "preparing",
  "processing",
  "qc",
  "ready",
  "delivered",
];

export function isItemReadyStatus(status: ItemStatus): boolean {
  return status === "ready" || status === "delivered";
}

export function countItemReadiness(
  items: Array<{ itemStatus: ItemStatus }>
): { ready: number; total: number; partial: boolean } {
  const active = items.filter((i) => i.itemStatus !== "cancelled");
  const ready = active.filter((i) => isItemReadyStatus(i.itemStatus)).length;
  const total = active.length;
  return {
    ready,
    total,
    partial: total > 0 && ready > 0 && ready < total,
  };
}

/** Kalemlere göre sipariş durumu önerisi (teslim edilmiş siparişe dokunmaz). */
export function deriveOrderStatusFromItems(
  items: Array<{ itemStatus: ItemStatus }>,
  currentOrderStatus: OrderStatus
): OrderStatus {
  if (currentOrderStatus === "delivered") return "delivered";

  const active = items.filter((i) => i.itemStatus !== "cancelled");
  if (active.length === 0) return currentOrderStatus;

  const allReady = active.every((i) => isItemReadyStatus(i.itemStatus));
  if (allReady) return "ready";

  return "preparing";
}

export function nextItemStatus(current: ItemStatus): ItemStatus | null {
  if (current === "cancelled") return null;
  const idx = ITEM_STATUS_WORKFLOW.indexOf(current);
  if (idx < 0 || idx >= ITEM_STATUS_WORKFLOW.length - 1) return null;
  return ITEM_STATUS_WORKFLOW[idx + 1];
}

export function prevItemStatus(current: ItemStatus): ItemStatus | null {
  if (current === "cancelled") return null;
  const idx = ITEM_STATUS_WORKFLOW.indexOf(current);
  if (idx <= 0) return null;
  return ITEM_STATUS_WORKFLOW[idx - 1];
}
