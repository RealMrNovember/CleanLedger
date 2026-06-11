export interface LinePriceItemInput {
  quantity?: number;
  originalPrice?: number;
  salePrice?: number;
  subtotal: number;
}

export interface LinePriceMetrics {
  catalogSubtotal: number;
  linePriceAdjustments: number;
  adjustedLineCount: number;
}

export function computeLinePriceMetrics(
  items: LinePriceItemInput[]
): LinePriceMetrics {
  let catalogSubtotal = 0;
  let linePriceAdjustments = 0;
  let adjustedLineCount = 0;

  for (const item of items) {
    const qty = item.quantity ?? 1;
    const unitOriginal =
      item.originalPrice ?? item.salePrice ?? item.subtotal / qty;
    const original = unitOriginal * qty;
    const sale = item.subtotal;
    catalogSubtotal += original;
    if (sale < original - 0.001) {
      linePriceAdjustments += original - sale;
      adjustedLineCount += 1;
    }
  }

  return { catalogSubtotal, linePriceAdjustments, adjustedLineCount };
}

export function hasLinePriceAdjustment(item: LinePriceItemInput): boolean {
  const qty = item.quantity ?? 1;
  const unitOriginal =
    item.originalPrice ?? item.salePrice ?? item.subtotal / qty;
  const original = unitOriginal * qty;
  return item.subtotal < original - 0.001;
}

export function linePriceCatalogTotal(item: LinePriceItemInput): number {
  const qty = item.quantity ?? 1;
  const unitOriginal =
    item.originalPrice ?? item.salePrice ?? item.subtotal / qty;
  return unitOriginal * qty;
}
