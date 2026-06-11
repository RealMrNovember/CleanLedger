import { describe, expect, it } from "vitest";
import {
  computeLinePriceMetrics,
  hasLinePriceAdjustment,
  linePriceCatalogTotal,
} from "./line-prices";

describe("computeLinePriceMetrics", () => {
  it("sums catalog subtotal and line-level discounts", () => {
    const metrics = computeLinePriceMetrics([
      {
        quantity: 2,
        originalPrice: 100,
        salePrice: 80,
        subtotal: 160,
      },
      {
        quantity: 1,
        originalPrice: 50,
        salePrice: 50,
        subtotal: 50,
      },
    ]);

    expect(metrics.catalogSubtotal).toBe(250);
    expect(metrics.linePriceAdjustments).toBe(40);
    expect(metrics.adjustedLineCount).toBe(1);
  });

  it("detects adjusted lines", () => {
    const item = {
      quantity: 1,
      originalPrice: 175,
      salePrice: 120,
      subtotal: 120,
    };
    expect(hasLinePriceAdjustment(item)).toBe(true);
    expect(linePriceCatalogTotal(item)).toBe(175);
  });
});
