export interface CustomerHistoryAnalyticsInput {
  order: { createdAt: string; totalAmount: number };
  items: Array<{ productName: string; serviceType: string }>;
}

export interface CustomerHistoryAnalytics {
  firstVisit: string | null;
  lastVisit: string | null;
  orderCount: number;
  totalSpent: number;
  topProducts: Array<{ name: string; count: number }>;
  topServices: Array<{ serviceType: string; count: number }>;
}

export function computeCustomerHistoryAnalytics(
  history: CustomerHistoryAnalyticsInput[],
  options?: { dateFrom?: string; dateTo?: string }
): CustomerHistoryAnalytics {
  const dateFrom = options?.dateFrom?.trim();
  const dateTo = options?.dateTo?.trim();

  const filtered = history.filter((entry) => {
    const day = entry.order.createdAt.slice(0, 10);
    if (dateFrom && day < dateFrom) return false;
    if (dateTo && day > dateTo) return false;
    return true;
  });

  const dates = filtered.map((h) => h.order.createdAt).sort();
  const productCounts = new Map<string, number>();
  const serviceCounts = new Map<string, number>();

  for (const entry of filtered) {
    for (const item of entry.items) {
      productCounts.set(
        item.productName,
        (productCounts.get(item.productName) ?? 0) + 1
      );
      serviceCounts.set(
        item.serviceType,
        (serviceCounts.get(item.serviceType) ?? 0) + 1
      );
    }
  }

  const sortDesc = (a: [string, number], b: [string, number]) => b[1] - a[1];

  return {
    firstVisit: dates[0] ?? null,
    lastVisit: dates[dates.length - 1] ?? null,
    orderCount: filtered.length,
    totalSpent: filtered.reduce((sum, h) => sum + h.order.totalAmount, 0),
    topProducts: [...productCounts.entries()]
      .sort(sortDesc)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count })),
    topServices: [...serviceCounts.entries()]
      .sort(sortDesc)
      .slice(0, 5)
      .map(([serviceType, count]) => ({ serviceType, count })),
  };
}
